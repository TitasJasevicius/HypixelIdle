using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HypixelidleBackEnd.Models;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //dont forget to auth and authorize later
    //[Authorize]
    public class ContractPointsShopController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public ContractPointsShopController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetContractPointsShopItems")]
        [AllowAnonymous]
        public async Task<ActionResult<List<ShopItemResponse>>> GetContractPointsShopItems(int? playerId = null)
        {
            var shopItems = await _context.Contractpointsshops
                .AsNoTracking()
                .Include(item => item.FkItemidItemNavigation)
                .Include(item => item.FkCollectionidCollectionNavigation)
                .Include(item => item.FkSkillsidSkillsNavigation)
                .ToListAsync();

            Player? player = null;
            Dictionary<int, int> collectionTiersByCollectionId = new();
            Dictionary<int, int> skillLevelsBySkillId = new();

            if (playerId.HasValue && playerId.Value > 0)
            {
                player = await _context.Players
                    .AsNoTracking()
                    .FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == playerId.Value);

                if (player != null)
                {
                    collectionTiersByCollectionId = await _context.Playercollections
                        .AsNoTracking()
                        .Where(playerCollection => playerCollection.FkPlayeridPlayer == playerId.Value)
                        .ToDictionaryAsync(
                            playerCollection => playerCollection.FkCollectionidCollection,
                            playerCollection => playerCollection.CurrentTier);

                    skillLevelsBySkillId = await _context.Playerskills
                        .AsNoTracking()
                        .Where(playerSkill => playerSkill.FkPlayeridPlayer == playerId.Value)
                        .ToDictionaryAsync(
                            playerSkill => playerSkill.FkSkillsidSkills,
                            playerSkill => playerSkill.Level);
                }
            }

            var response = shopItems
                .Select(shopItem => BuildShopItemResponse(shopItem, player, collectionTiersByCollectionId, skillLevelsBySkillId))
                .OrderBy(entry => entry.Price)
                .ThenBy(entry => entry.ItemName)
                .ToList();

            return Ok(response);
        }

        [HttpGet]
        [Route("GetContractPointsShopItem")]
        [AllowAnonymous]
        public async Task<ActionResult<ShopItemResponse>> GetContractPointsShopItem(int id, int? playerId = null)
        {
            var shopItem = await _context.Contractpointsshops
                .AsNoTracking()
                .Include(item => item.FkItemidItemNavigation)
                .Include(item => item.FkCollectionidCollectionNavigation)
                .Include(item => item.FkSkillsidSkillsNavigation)
                .FirstOrDefaultAsync(item => item.IdContractPointsShop == id);

            if (shopItem == null)
            {
                return NotFound();
            }

            Player? player = null;
            Dictionary<int, int> collectionTiersByCollectionId = new();
            Dictionary<int, int> skillLevelsBySkillId = new();

            if (playerId.HasValue && playerId.Value > 0)
            {
                player = await _context.Players
                    .AsNoTracking()
                    .FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == playerId.Value);

                if (player != null)
                {
                    collectionTiersByCollectionId = await _context.Playercollections
                        .AsNoTracking()
                        .Where(playerCollection => playerCollection.FkPlayeridPlayer == playerId.Value)
                        .ToDictionaryAsync(
                            playerCollection => playerCollection.FkCollectionidCollection,
                            playerCollection => playerCollection.CurrentTier);

                    skillLevelsBySkillId = await _context.Playerskills
                        .AsNoTracking()
                        .Where(playerSkill => playerSkill.FkPlayeridPlayer == playerId.Value)
                        .ToDictionaryAsync(
                            playerSkill => playerSkill.FkSkillsidSkills,
                            playerSkill => playerSkill.Level);
                }
            }

            return Ok(BuildShopItemResponse(shopItem, player, collectionTiersByCollectionId, skillLevelsBySkillId));
        }

        [HttpGet]
        [Route("GetPlayerContractPoints")]
        [AllowAnonymous]
        public async Task<ActionResult<PlayerContractPointsResponse>> GetPlayerContractPoints(int playerId)
        {
            if (playerId <= 0)
            {
                return BadRequest("Valid playerId is required.");
            }

            var player = await _context.Players
                .AsNoTracking()
                .FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == playerId);

            if (player == null)
            {
                return NotFound("Player not found.");
            }

            return Ok(new PlayerContractPointsResponse
            {
                PlayerId = player.IdPlayer,
                ContractPoints = player.ContractPoints,
            });
        }

        [HttpPost]
        [Route("PurchaseContractPointsShopItem")]
        [AllowAnonymous]
        public async Task<ActionResult<PurchaseShopItemResponse>> PurchaseContractPointsShopItem([FromBody] PurchaseShopItemRequest request)
        {
            if (request.PlayerId <= 0 || request.ShopItemId <= 0)
            {
                return BadRequest("Valid playerId and shopItemId are required.");
            }

            var purchaseCount = Math.Max(1, request.PurchaseCount);

            var player = await _context.Players
                .FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == request.PlayerId);

            if (player == null)
            {
                return NotFound("Player not found.");
            }

            var shopItem = await _context.Contractpointsshops
                .Include(item => item.FkItemidItemNavigation)
                .Include(item => item.FkCollectionidCollectionNavigation)
                .Include(item => item.FkSkillsidSkillsNavigation)
                .FirstOrDefaultAsync(item => item.IdContractPointsShop == request.ShopItemId);

            if (shopItem == null)
            {
                return NotFound("Shop item not found.");
            }

            var requirementResult = await ValidateRequirements(request.PlayerId, shopItem);
            if (!requirementResult.Success)
            {
                return Conflict(requirementResult.ErrorMessage);
            }

            if (shopItem.Price < 0)
            {
                return Conflict("Shop item has invalid price.");
            }

            if (shopItem.Quantity <= 0)
            {
                return Conflict("Shop item has invalid quantity.");
            }

            var totalCostLong = (long)shopItem.Price * purchaseCount;
            var totalQuantityLong = (long)shopItem.Quantity * purchaseCount;

            if (totalCostLong > int.MaxValue || totalQuantityLong > int.MaxValue)
            {
                return Conflict("Purchase amount is too large.");
            }

            var totalCost = (int)totalCostLong;
            var totalQuantity = (int)totalQuantityLong;

            if (player.ContractPoints < totalCost)
            {
                return Conflict($"Not enough contract points. Required: {totalCost}, available: {player.ContractPoints}.");
            }

            var inventoryCapacityResult = await ValidateInventoryCapacity(request.PlayerId, shopItem.FkItemidItem, totalQuantity);
            if (!inventoryCapacityResult.Success)
            {
                return Conflict(inventoryCapacityResult.ErrorMessage);
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            player.ContractPoints -= totalCost;

            var addResult = await TryAddItemToInventory(request.PlayerId, shopItem.FkItemidItem, totalQuantity);
            if (!addResult.Success)
            {
                await transaction.RollbackAsync();
                return Conflict(addResult.ErrorMessage);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new PurchaseShopItemResponse
            {
                PlayerId = request.PlayerId,
                ShopItemId = shopItem.IdContractPointsShop,
                PurchaseCount = purchaseCount,
                ItemId = shopItem.FkItemidItem,
                ItemName = shopItem.FkItemidItemNavigation?.Name ?? string.Empty,
                GrantedQuantity = totalQuantity,
                TotalCostContractPoints = totalCost,
                RemainingContractPoints = player.ContractPoints,
                Purchased = true,
            });
        }

        private ShopItemResponse BuildShopItemResponse(
            Contractpointsshop shopItem,
            Player? player,
            IReadOnlyDictionary<int, int> collectionTiersByCollectionId,
            IReadOnlyDictionary<int, int> skillLevelsBySkillId)
        {
            var today = DateTime.UtcNow.Date;
            var isWithinStartWindow = !shopItem.StartAt.HasValue || shopItem.StartAt.Value.Date <= today;
            var isWithinEndWindow = !shopItem.EndAt.HasValue || shopItem.EndAt.Value.Date >= today;
            var isWithinActiveWindow = isWithinStartWindow && isWithinEndWindow;

            var requiredCollectionTier = shopItem.RequiredCollectionTier;
            var playerCollectionTier = 0;
            var meetsCollectionRequirement = true;

            if (shopItem.FkCollectionidCollection.HasValue && requiredCollectionTier.HasValue)
            {
                collectionTiersByCollectionId.TryGetValue(shopItem.FkCollectionidCollection.Value, out playerCollectionTier);
                meetsCollectionRequirement = playerCollectionTier >= requiredCollectionTier.Value;
            }

            var requiredSkillLevel = shopItem.SkillLevel;
            var playerSkillLevel = 0;
            var meetsSkillRequirement = true;

            if (shopItem.FkSkillsidSkills.HasValue && requiredSkillLevel.HasValue)
            {
                skillLevelsBySkillId.TryGetValue(shopItem.FkSkillsidSkills.Value, out playerSkillLevel);
                meetsSkillRequirement = playerSkillLevel >= requiredSkillLevel.Value;
            }

            var isEligible = isWithinActiveWindow && meetsCollectionRequirement && meetsSkillRequirement;
            var missingRequirementReason = BuildMissingRequirementReason(
                isWithinActiveWindow,
                meetsCollectionRequirement,
                meetsSkillRequirement,
                requiredCollectionTier,
                playerCollectionTier,
                requiredSkillLevel,
                playerSkillLevel);

            return new ShopItemResponse
            {
                ShopItemId = shopItem.IdContractPointsShop,
                ItemId = shopItem.FkItemidItem,
                ItemName = shopItem.FkItemidItemNavigation?.Name ?? string.Empty,
                ItemIcon = shopItem.FkItemidItemNavigation?.Icon,
                Price = shopItem.Price,
                Quantity = shopItem.Quantity,
                CollectionId = shopItem.FkCollectionidCollection,
                CollectionName = shopItem.FkCollectionidCollectionNavigation?.Name,
                RequiredCollectionTier = requiredCollectionTier,
                PlayerCollectionTier = playerCollectionTier,
                SkillId = shopItem.FkSkillsidSkills,
                SkillName = shopItem.FkSkillsidSkillsNavigation?.Name,
                RequiredSkillLevel = requiredSkillLevel,
                PlayerSkillLevel = playerSkillLevel,
                StartAt = shopItem.StartAt,
                EndAt = shopItem.EndAt,
                IsWithinActiveWindow = isWithinActiveWindow,
                MeetsCollectionRequirement = meetsCollectionRequirement,
                MeetsSkillRequirement = meetsSkillRequirement,
                IsEligible = isEligible,
                MissingRequirementReason = missingRequirementReason,
                PlayerContractPoints = player?.ContractPoints,
            };
        }

        private async Task<OperationResult> ValidateRequirements(int playerId, Contractpointsshop shopItem)
        {
            var today = DateTime.UtcNow.Date;
            if (shopItem.StartAt.HasValue && today < shopItem.StartAt.Value.Date)
            {
                return OperationResult.Fail("This shop item is not available yet.");
            }

            if (shopItem.EndAt.HasValue && today > shopItem.EndAt.Value.Date)
            {
                return OperationResult.Fail("This shop item is no longer available.");
            }

            if (shopItem.FkCollectionidCollection.HasValue && shopItem.RequiredCollectionTier.HasValue)
            {
                var playerCollectionTier = await _context.Playercollections
                    .AsNoTracking()
                    .Where(playerCollection => playerCollection.FkPlayeridPlayer == playerId)
                    .Where(playerCollection => playerCollection.FkCollectionidCollection == shopItem.FkCollectionidCollection.Value)
                    .Select(playerCollection => playerCollection.CurrentTier)
                    .FirstOrDefaultAsync();

                if (playerCollectionTier < shopItem.RequiredCollectionTier.Value)
                {
                    return OperationResult.Fail($"Collection requirement not met. Required tier: {shopItem.RequiredCollectionTier.Value}, current tier: {playerCollectionTier}.");
                }
            }

            if (shopItem.FkSkillsidSkills.HasValue && shopItem.SkillLevel.HasValue)
            {
                var playerSkillLevel = await _context.Playerskills
                    .AsNoTracking()
                    .Where(playerSkill => playerSkill.FkPlayeridPlayer == playerId)
                    .Where(playerSkill => playerSkill.FkSkillsidSkills == shopItem.FkSkillsidSkills.Value)
                    .Select(playerSkill => playerSkill.Level)
                    .FirstOrDefaultAsync();

                if (playerSkillLevel < shopItem.SkillLevel.Value)
                {
                    return OperationResult.Fail($"Skill requirement not met. Required level: {shopItem.SkillLevel.Value}, current level: {playerSkillLevel}.");
                }
            }

            return OperationResult.Ok();
        }

        private async Task<OperationResult> ValidateInventoryCapacity(int playerId, int itemId, int quantity)
        {
            var item = await _context.Items
                .AsNoTracking()
                .FirstOrDefaultAsync(currentItem => currentItem.IdItem == itemId);

            if (item == null)
            {
                return OperationResult.Fail("Shop item references unknown item.");
            }

            var inventorySlots = await _context.Playerinventoryslots
                .AsNoTracking()
                .Include(slot => slot.Iteminstance)
                .Where(slot => slot.FkPlayeridPlayer == playerId)
                .OrderBy(slot => slot.SlotIndex)
                .Select(slot => new InventoryCapacitySimulationSlot
                {
                    ItemId = slot.FkItemidItem,
                    Quantity = slot.Quantity,
                    HasItemInstance = slot.Iteminstance != null,
                })
                .ToListAsync();

            if (inventorySlots.Count == 0)
            {
                return OperationResult.Fail("Inventory not found for player.");
            }

            var maxStackSize = item.Stackable ? Math.Max(1, item.StackValue) : 1;
            var remainingQuantity = quantity;

            foreach (var slot in inventorySlots.Where(slot =>
                         slot.ItemId == itemId
                         && !slot.HasItemInstance
                         && slot.Quantity < maxStackSize))
            {
                var freeSpace = maxStackSize - slot.Quantity;
                var toAdd = Math.Min(remainingQuantity, freeSpace);
                slot.Quantity += toAdd;
                remainingQuantity -= toAdd;

                if (remainingQuantity == 0)
                {
                    break;
                }
            }

            if (remainingQuantity > 0)
            {
                foreach (var slot in inventorySlots.Where(slot =>
                             slot.ItemId == null
                             && !slot.HasItemInstance
                             && slot.Quantity <= 0))
                {
                    var toAdd = Math.Min(remainingQuantity, maxStackSize);
                    slot.ItemId = itemId;
                    slot.Quantity = toAdd;
                    remainingQuantity -= toAdd;

                    if (remainingQuantity == 0)
                    {
                        break;
                    }
                }
            }

            if (remainingQuantity > 0)
            {
                return OperationResult.Fail("Not enough inventory space for this purchase.");
            }

            return OperationResult.Ok();
        }

        private async Task<OperationResult> TryAddItemToInventory(int playerId, int itemId, int quantity)
        {
            if (quantity <= 0)
            {
                return OperationResult.Ok();
            }

            var item = await _context.Items.FirstOrDefaultAsync(currentItem => currentItem.IdItem == itemId);
            if (item == null)
            {
                return OperationResult.Fail("Shop item references unknown item.");
            }

            var inventorySlots = await _context.Playerinventoryslots
                .Include(slot => slot.Iteminstance)
                .Where(slot => slot.FkPlayeridPlayer == playerId)
                .OrderBy(slot => slot.SlotIndex)
                .ToListAsync();

            if (inventorySlots.Count == 0)
            {
                return OperationResult.Fail("Inventory not found for player.");
            }

            var maxStackSize = item.Stackable ? Math.Max(1, item.StackValue) : 1;
            var remainingQuantity = quantity;

            foreach (var slot in inventorySlots.Where(slot =>
                         slot.FkItemidItem == itemId
                         && slot.Iteminstance == null
                         && slot.Quantity < maxStackSize))
            {
                var freeSpace = maxStackSize - slot.Quantity;
                var toAdd = Math.Min(remainingQuantity, freeSpace);

                slot.Quantity += toAdd;
                remainingQuantity -= toAdd;

                if (remainingQuantity == 0)
                {
                    break;
                }
            }

            if (remainingQuantity > 0)
            {
                foreach (var slot in inventorySlots.Where(slot =>
                             slot.FkItemidItem == null
                             && slot.Iteminstance == null
                             && slot.Quantity <= 0))
                {
                    var toAdd = Math.Min(remainingQuantity, maxStackSize);
                    slot.FkItemidItem = itemId;
                    slot.Quantity = toAdd;
                    remainingQuantity -= toAdd;

                    if (remainingQuantity == 0)
                    {
                        break;
                    }
                }
            }

            if (remainingQuantity > 0)
            {
                return OperationResult.Fail("Inventory is full. Could not complete purchase.");
            }

            return OperationResult.Ok();
        }

        private static string BuildMissingRequirementReason(
            bool isWithinActiveWindow,
            bool meetsCollectionRequirement,
            bool meetsSkillRequirement,
            int? requiredCollectionTier,
            int playerCollectionTier,
            int? requiredSkillLevel,
            int playerSkillLevel)
        {
            if (!isWithinActiveWindow)
            {
                return "Unavailable for current date.";
            }

            if (!meetsCollectionRequirement && requiredCollectionTier.HasValue)
            {
                return $"Requires collection tier {requiredCollectionTier.Value} (current {playerCollectionTier}).";
            }

            if (!meetsSkillRequirement && requiredSkillLevel.HasValue)
            {
                return $"Requires skill level {requiredSkillLevel.Value} (current {playerSkillLevel}).";
            }

            return string.Empty;
        }

        public sealed class PurchaseShopItemRequest
        {
            public int PlayerId { get; set; }

            public int ShopItemId { get; set; }

            public int PurchaseCount { get; set; } = 1;
        }

        public sealed class PurchaseShopItemResponse
        {
            public int PlayerId { get; set; }

            public int ShopItemId { get; set; }

            public int PurchaseCount { get; set; }

            public int ItemId { get; set; }

            public string ItemName { get; set; } = string.Empty;

            public int GrantedQuantity { get; set; }

            public int TotalCostContractPoints { get; set; }

            public int RemainingContractPoints { get; set; }

            public bool Purchased { get; set; }
        }

        public sealed class PlayerContractPointsResponse
        {
            public int PlayerId { get; set; }

            public int ContractPoints { get; set; }
        }

        public sealed class ShopItemResponse
        {
            public int ShopItemId { get; set; }

            public int ItemId { get; set; }

            public string ItemName { get; set; } = string.Empty;

            public string? ItemIcon { get; set; }

            public int Price { get; set; }

            public int Quantity { get; set; }

            public int? CollectionId { get; set; }

            public string? CollectionName { get; set; }

            public int? RequiredCollectionTier { get; set; }

            public int PlayerCollectionTier { get; set; }

            public int? SkillId { get; set; }

            public string? SkillName { get; set; }

            public int? RequiredSkillLevel { get; set; }

            public int PlayerSkillLevel { get; set; }

            public DateTime? StartAt { get; set; }

            public DateTime? EndAt { get; set; }

            public bool IsWithinActiveWindow { get; set; }

            public bool MeetsCollectionRequirement { get; set; }

            public bool MeetsSkillRequirement { get; set; }

            public bool IsEligible { get; set; }

            public string MissingRequirementReason { get; set; } = string.Empty;

            public int? PlayerContractPoints { get; set; }
        }

        private sealed class InventoryCapacitySimulationSlot
        {
            public int? ItemId { get; set; }

            public int Quantity { get; set; }

            public bool HasItemInstance { get; set; }
        }

        private sealed class OperationResult
        {
            public bool Success { get; private set; }

            public string ErrorMessage { get; private set; } = string.Empty;

            public static OperationResult Ok()
            {
                return new OperationResult { Success = true };
            }

            public static OperationResult Fail(string errorMessage)
            {
                return new OperationResult
                {
                    Success = false,
                    ErrorMessage = errorMessage,
                };
            }
        }

    }
}
