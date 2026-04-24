using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;
using HypixelidleBackEnd.Authentication;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PlayerContractsController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public PlayerContractsController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetPlayerContracts")]
        public async Task<ActionResult<List<PlayerContractSummaryResponse>>> GetPlayerContracts(int playerId)
        {
            if (playerId <= 0)
            {
                return BadRequest("Valid playerId is required.");
            }

            var playerContracts = await _context.Playercontracts
                .AsNoTracking()
                .Where(playerContract => playerContract.FkPlayeridPlayer == playerId)
                .OrderBy(playerContract => playerContract.IdPlayerContracts)
                .Select(playerContract => new PlayerContractSummaryResponse
                {
                    PlayerContractId = playerContract.IdPlayerContracts,
                    PlayerId = playerContract.FkPlayeridPlayer,
                    ContractId = playerContract.FkContractidContract,
                    ContractName = playerContract.FkContractidContractNavigation.ContractName,
                    Difficulty = playerContract.FkContractidContractNavigation.FkContractdifficultyidContractdifficultyNavigation.Value,
                    SkillName = playerContract.FkContractidContractNavigation.FkSkillsidSkillsNavigation.Name,
                    ProgressCount = playerContract.ProgressCount,
                    TargetCount = playerContract.FkContractidContractNavigation.TargetCount,
                    IsReadyToComplete = playerContract.ProgressCount >= playerContract.FkContractidContractNavigation.TargetCount,
                })
                .ToListAsync();

            return Ok(playerContracts);
        }

        [HttpPost]
        [Route("AssignContract")]
        public async Task<ActionResult<PlayerContractSummaryResponse>> AssignContract([FromBody] AssignContractRequest request)
        {

            if(!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            if (request.PlayerId <= 0 || request.ContractId <= 0)
            {
                return BadRequest("Valid PlayerId and ContractId are required.");
            }

            var playerExists = await _context.Players.AnyAsync(player => player.IdPlayer == request.PlayerId);
            if (!playerExists)
            {
                return NotFound("Player not found.");
            }

            var contractExists = await _context.Contracts.AnyAsync(contract => contract.IdContract == request.ContractId);
            if (!contractExists)
            {
                return NotFound("Contract not found.");
            }

            var requestedContractSkillId = await _context.Contracts
                .Where(contract => contract.IdContract == request.ContractId)
                .Select(contract => contract.FkSkillsidSkills)
                .FirstOrDefaultAsync();

            var existing = await _context.Playercontracts
                .Include(playerContract => playerContract.FkContractidContractNavigation)
                .FirstOrDefaultAsync(playerContract =>
                    playerContract.FkPlayeridPlayer == request.PlayerId
                    && playerContract.FkContractidContract == request.ContractId);

            if (existing != null)
            {
                var existingResponse = await BuildPlayerContractSummary(existing.IdPlayerContracts);
                if (existingResponse == null)
                {
                    return NotFound("Assigned contract could not be loaded.");
                }

                return Ok(existingResponse);
            }

            var activeContractForSameSkill = await _context.Playercontracts
                .AsNoTracking()
                .Where(playerContract => playerContract.FkPlayeridPlayer == request.PlayerId)
                .Where(playerContract => playerContract.FkContractidContractNavigation.FkSkillsidSkills == requestedContractSkillId)
                .Select(playerContract => new
                {
                    playerContract.FkContractidContract,
                    playerContract.FkContractidContractNavigation.ContractName,
                    playerContract.FkContractidContractNavigation.FkSkillsidSkillsNavigation.Name,
                })
                .FirstOrDefaultAsync();

            if (activeContractForSameSkill != null)
            {
                return Conflict($"You already have an active {activeContractForSameSkill.Name} contract: {activeContractForSameSkill.ContractName}.");
            }

            existing = new Playercontract
            {
                FkPlayeridPlayer = request.PlayerId,
                FkContractidContract = request.ContractId,
                ProgressCount = 0,
            };

            _context.Playercontracts.Add(existing);
            await _context.SaveChangesAsync();

            var response = await BuildPlayerContractSummary(existing.IdPlayerContracts);
            if (response == null)
            {
                return NotFound("Assigned contract could not be loaded.");
            }

            return Ok(response);
        }

        [HttpPost]
        [Route("AddProgress")]
        public async Task<ActionResult<PlayerContractSummaryResponse>> AddProgress([FromBody] AddPlayerContractProgressRequest request)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            if (request.PlayerId <= 0 || request.ContractId <= 0)
            {
                return BadRequest("Valid PlayerId and ContractId are required.");
            }

            var amountToAdd = Math.Max(1, request.AmountToAdd);

            var playerContract = await _context.Playercontracts
                .Include(current => current.FkContractidContractNavigation)
                .FirstOrDefaultAsync(current =>
                    current.FkPlayeridPlayer == request.PlayerId
                    && current.FkContractidContract == request.ContractId);

            if (playerContract == null)
            {
                return NotFound("Player contract not found. Assign contract first.");
            }

            var targetCount = Math.Max(1, playerContract.FkContractidContractNavigation.TargetCount);
            playerContract.ProgressCount = Math.Min(targetCount, playerContract.ProgressCount + amountToAdd);

            await _context.SaveChangesAsync();

            var response = await BuildPlayerContractSummary(playerContract.IdPlayerContracts);
            if (response == null)
            {
                return NotFound("Updated contract could not be loaded.");
            }

            return Ok(response);
        }

        [HttpPost]
        [Route("AddMobKillProgress")]
        public async Task<ActionResult<List<PlayerContractSummaryResponse>>> AddMobKillProgress([FromBody] AddMobKillProgressRequest request)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            if (request.PlayerId <= 0 || request.MobId <= 0)
            {
                return BadRequest("Valid PlayerId and MobId are required.");
            }

            var activeContracts = await _context.Playercontracts
                .Include(playerContract => playerContract.FkContractidContractNavigation)
                .Where(playerContract => playerContract.FkPlayeridPlayer == request.PlayerId)
                .Where(playerContract => playerContract.FkContractidContractNavigation.FkMobidMob == request.MobId)
                .ToListAsync();

            if (activeContracts.Count == 0)
            {
                return NoContent();
            }

            var increment = Math.Max(1, request.AmountToAdd);

            foreach (var playerContract in activeContracts)
            {
                var targetCount = Math.Max(1, playerContract.FkContractidContractNavigation.TargetCount);
                playerContract.ProgressCount = Math.Min(targetCount, playerContract.ProgressCount + increment);
            }

            await _context.SaveChangesAsync();

            var updatedSummaries = new List<PlayerContractSummaryResponse>(activeContracts.Count);
            foreach (var playerContract in activeContracts)
            {
                var summary = await BuildPlayerContractSummary(playerContract.IdPlayerContracts);
                if (summary != null)
                {
                    updatedSummaries.Add(summary);
                }
            }

            return Ok(updatedSummaries);
        }

        [HttpPost]
        [Route("AddNodeMineProgress")]
        public async Task<ActionResult<List<PlayerContractSummaryResponse>>> AddNodeMineProgress([FromBody] AddNodeMineProgressRequest request)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            if (request.PlayerId <= 0 || request.NodeId <= 0)
            {
                return BadRequest("Valid PlayerId and NodeId are required.");
            }

            var activeContracts = await _context.Playercontracts
                .Include(playerContract => playerContract.FkContractidContractNavigation)
                .Where(playerContract => playerContract.FkPlayeridPlayer == request.PlayerId)
                .Where(playerContract => playerContract.FkContractidContractNavigation.FkNodeidNode == request.NodeId)
                .ToListAsync();

            if (activeContracts.Count == 0)
            {
                return NoContent();
            }

            var increment = Math.Max(1, request.AmountToAdd);

            foreach (var playerContract in activeContracts)
            {
                var targetCount = Math.Max(1, playerContract.FkContractidContractNavigation.TargetCount);
                playerContract.ProgressCount = Math.Min(targetCount, playerContract.ProgressCount + increment);
            }

            await _context.SaveChangesAsync();

            var updatedSummaries = new List<PlayerContractSummaryResponse>(activeContracts.Count);
            foreach (var playerContract in activeContracts)
            {
                var summary = await BuildPlayerContractSummary(playerContract.IdPlayerContracts);
                if (summary != null)
                {
                    updatedSummaries.Add(summary);
                }
            }

            return Ok(updatedSummaries);
        }

        [HttpPost]
        [Route("CompleteContract")]
        public async Task<ActionResult<CompleteContractResponse>> CompleteContract([FromBody] CompleteContractRequest request)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            if (request.PlayerId <= 0 || request.ContractId <= 0)
            {
                return BadRequest("Valid PlayerId and ContractId are required.");
            }

            var playerContract = await _context.Playercontracts
                .Include(current => current.FkContractidContractNavigation)
                .ThenInclude(contract => contract.ContractContractrewards)
                .ThenInclude(link => link.FkContractRewardidContractRewardNavigation)
                .ThenInclude(reward => reward.FkItemidItemNavigation)
                .FirstOrDefaultAsync(current =>
                    current.FkPlayeridPlayer == request.PlayerId
                    && current.FkContractidContract == request.ContractId);

            if (playerContract == null)
            {
                return NotFound("Player contract not found.");
            }

            var targetCount = Math.Max(1, playerContract.FkContractidContractNavigation.TargetCount);
            if (playerContract.ProgressCount < targetCount)
            {
                return BadRequest($"Contract progress is {playerContract.ProgressCount}/{targetCount}. Not ready to complete.");
            }

            var player = await _context.Players.FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == request.PlayerId);
            if (player == null)
            {
                return NotFound("Player not found.");
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var random = Random.Shared;
            var rolledRewards = new List<RewardRollResult>();
            var totalXpAwarded = 0;
            var totalCoinsAwarded = 0;
            var totalContractPointsAwarded = 0;
            var itemRewards = new Dictionary<int, int>();

            var configuredRewardIds = playerContract.FkContractidContractNavigation.ContractContractrewards
                .Select(link => link.FkContractRewardidContractReward)
                .Distinct()
                .ToList();

            var resolvedRewards = new List<Contractreward>();

            foreach (var link in playerContract.FkContractidContractNavigation.ContractContractrewards)
            {
                if (link.FkContractRewardidContractRewardNavigation != null)
                {
                    resolvedRewards.Add(link.FkContractRewardidContractRewardNavigation);
                }
            }

            if (configuredRewardIds.Count > 0)
            {
                var missingRewardIds = configuredRewardIds
                    .Except(resolvedRewards.Select(reward => reward.IdContractReward))
                    .ToList();

                if (missingRewardIds.Count > 0)
                {
                    var fallbackRewards = await _context.Contractrewards
                        .Include(reward => reward.FkItemidItemNavigation)
                        .Where(reward => missingRewardIds.Contains(reward.IdContractReward))
                        .ToListAsync();

                    resolvedRewards.AddRange(fallbackRewards);
                }
            }

            if (resolvedRewards.Count == 0)
            {
                await transaction.RollbackAsync();
                return Conflict("This contract has no valid rewards configured yet. Please contact an admin.");
            }

            foreach (var reward in resolvedRewards)
            {
                var xpToAward = reward.XpReward.HasValue && reward.XpReward.Value > 0
                    ? reward.XpReward.Value
                    : 0;
                var coinsToAward = reward.CoinReward.HasValue && reward.CoinReward.Value > 0
                    ? reward.CoinReward.Value
                    : 0;
                var contractPointsToAward = reward.ContractPoints > 0
                    ? reward.ContractPoints
                    : 0;

                totalXpAwarded += xpToAward;
                totalCoinsAwarded += coinsToAward;
                totalContractPointsAwarded += contractPointsToAward;

                var hasItemReward = reward.FkItemidItem.HasValue && reward.FkItemidItem.Value > 0;
                var normalizedChance = hasItemReward ? NormalizeRewardChance(reward.Chance) : 1f;
                var itemAwarded = hasItemReward && random.NextDouble() <= normalizedChance;

                if (itemAwarded)
                {
                    if (!itemRewards.ContainsKey(reward.FkItemidItem!.Value))
                    {
                        itemRewards[reward.FkItemidItem.Value] = 0;
                    }

                    itemRewards[reward.FkItemidItem.Value] += 1;
                }

                rolledRewards.Add(new RewardRollResult
                {
                    ContractRewardId = reward.IdContractReward,
                    Chance = normalizedChance,
                    Awarded = !hasItemReward || itemAwarded,
                    XpReward = xpToAward,
                    CoinReward = coinsToAward,
                    ContractPoints = contractPointsToAward,
                    ItemRewardId = reward.FkItemidItem,
                    ItemRewardName = reward.FkItemidItemNavigation?.Name,
                    ItemRewardQuantity = itemAwarded ? 1 : 0,
                });
            }

            var inventoryCapacityCheck = await ValidateInventoryCapacityForRewards(request.PlayerId, itemRewards);
            if (!inventoryCapacityCheck.Success)
            {
                await transaction.RollbackAsync();
                return Conflict(inventoryCapacityCheck.ErrorMessage);
            }

            player.CurrentXp += totalXpAwarded;
            player.ContractPoints += totalContractPointsAwarded;

            if (totalCoinsAwarded > 0)
            {
                var purse = await _context.Purses.FirstOrDefaultAsync(currentPurse => currentPurse.FkPlayeridPlayer == request.PlayerId);
                if (purse == null)
                {
                    purse = new Purse
                    {
                        IdPurse = await GetNextPurseId(),
                        FkPlayeridPlayer = request.PlayerId,
                        Balance = 0,
                        Bits = 0,
                    };

                    _context.Purses.Add(purse);
                }

                purse.Balance += totalCoinsAwarded;
            }

            foreach (var itemReward in itemRewards)
            {
                var addResult = await TryAddItemToInventory(request.PlayerId, itemReward.Key, itemReward.Value);
                if (!addResult.Success)
                {
                    await transaction.RollbackAsync();
                    return Conflict(addResult.ErrorMessage);
                }
            }

            _context.Playercontracts.Remove(playerContract);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new CompleteContractResponse
            {
                PlayerId = request.PlayerId,
                ContractId = request.ContractId,
                ContractName = playerContract.FkContractidContractNavigation.ContractName,
                Completed = true,
                TotalXpAwarded = totalXpAwarded,
                TotalCoinsAwarded = totalCoinsAwarded,
                TotalContractPointsAwarded = totalContractPointsAwarded,
                ItemRewardsAwarded = itemRewards
                    .Select(current => new ItemRewardAwarded
                    {
                        ItemId = current.Key,
                        Quantity = current.Value,
                    })
                    .ToList(),
                RewardRolls = rolledRewards,
            });
        }

        [HttpPost]
        [Route("CancelContract")]
        public async Task<ActionResult<CancelContractResponse>> CancelContract([FromBody] CancelContractRequest request)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            if (request.PlayerId <= 0 || request.ContractId <= 0)
            {
                return BadRequest("Valid PlayerId and ContractId are required.");
            }

            var playerContract = await _context.Playercontracts
                .Include(current => current.FkContractidContractNavigation)
                .ThenInclude(contract => contract.ContractContractrewards)
                .ThenInclude(link => link.FkContractRewardidContractRewardNavigation)
                .FirstOrDefaultAsync(current =>
                    current.FkPlayeridPlayer == request.PlayerId
                    && current.FkContractidContract == request.ContractId);

            if (playerContract == null)
            {
                return NotFound("Player contract not found.");
            }

            var player = await _context.Players.FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == request.PlayerId);
            if (player == null)
            {
                return NotFound("Player not found.");
            }

            var configuredRewardIds = playerContract.FkContractidContractNavigation.ContractContractrewards
                .Select(link => link.FkContractRewardidContractReward)
                .Distinct()
                .ToList();

            var resolvedRewards = new List<Contractreward>();
            foreach (var link in playerContract.FkContractidContractNavigation.ContractContractrewards)
            {
                if (link.FkContractRewardidContractRewardNavigation != null)
                {
                    resolvedRewards.Add(link.FkContractRewardidContractRewardNavigation);
                }
            }

            if (configuredRewardIds.Count > 0)
            {
                var missingRewardIds = configuredRewardIds
                    .Except(resolvedRewards.Select(reward => reward.IdContractReward))
                    .ToList();

                if (missingRewardIds.Count > 0)
                {
                    var fallbackRewards = await _context.Contractrewards
                        .Where(reward => missingRewardIds.Contains(reward.IdContractReward))
                        .ToListAsync();

                    resolvedRewards.AddRange(fallbackRewards);
                }
            }

            var totalPotentialContractPoints = resolvedRewards
                .Where(reward => reward.ContractPoints > 0)
                .Sum(reward => reward.ContractPoints);

            var cancelCost = (int)Math.Ceiling(totalPotentialContractPoints / 2.0);
            if (cancelCost > player.ContractPoints)
            {
                return Conflict($"Not enough contract points to cancel this contract. Required: {cancelCost}, available: {player.ContractPoints}.");
            }

            player.ContractPoints -= cancelCost;
            _context.Playercontracts.Remove(playerContract);
            await _context.SaveChangesAsync();

            return Ok(new CancelContractResponse
            {
                PlayerId = request.PlayerId,
                ContractId = request.ContractId,
                CancelCostContractPoints = cancelCost,
                RemainingContractPoints = player.ContractPoints,
                Cancelled = true,
            });
        }

        private async Task<PlayerContractSummaryResponse?> BuildPlayerContractSummary(int playerContractId)
        {
            return await _context.Playercontracts
                .AsNoTracking()
                .Where(playerContract => playerContract.IdPlayerContracts == playerContractId)
                .Select(playerContract => new PlayerContractSummaryResponse
                {
                    PlayerContractId = playerContract.IdPlayerContracts,
                    PlayerId = playerContract.FkPlayeridPlayer,
                    ContractId = playerContract.FkContractidContract,
                    ContractName = playerContract.FkContractidContractNavigation.ContractName,
                    Difficulty = playerContract.FkContractidContractNavigation.FkContractdifficultyidContractdifficultyNavigation.Value,
                    SkillName = playerContract.FkContractidContractNavigation.FkSkillsidSkillsNavigation.Name,
                    ProgressCount = playerContract.ProgressCount,
                    TargetCount = playerContract.FkContractidContractNavigation.TargetCount,
                    IsReadyToComplete = playerContract.ProgressCount >= playerContract.FkContractidContractNavigation.TargetCount,
                })
                .FirstOrDefaultAsync();
        }

        private async Task<int> GetNextPurseId()
        {
            var maxId = await _context.Purses.MaxAsync(purse => (int?)purse.IdPurse) ?? 0;
            return maxId + 1;
        }

        private async Task<InventoryAddResult> TryAddItemToInventory(int playerId, int itemId, int quantity)
        {
            if (quantity <= 0)
            {
                return InventoryAddResult.Ok();
            }

            var item = await _context.Items.FirstOrDefaultAsync(currentItem => currentItem.IdItem == itemId);
            if (item == null)
            {
                return InventoryAddResult.Fail($"Reward item {itemId} does not exist.");
            }

            var inventorySlots = await _context.Playerinventoryslots
                .Include(slot => slot.Iteminstance)
                .Where(slot => slot.FkPlayeridPlayer == playerId)
                .OrderBy(slot => slot.SlotIndex)
                .ToListAsync();

            if (inventorySlots.Count == 0)
            {
                return InventoryAddResult.Fail("Inventory not found for player.");
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
                return InventoryAddResult.Fail($"Inventory is full. Could not grant {remainingQuantity} reward item(s).");
            }

            return InventoryAddResult.Ok();
        }

        private static float NormalizeRewardChance(float configuredChance)
        {
            if (configuredChance <= 0f)
            {
                return 0f;
            }

            if (configuredChance <= 1f)
            {
                return configuredChance;
            }

            return Math.Clamp(configuredChance / 100f, 0f, 1f);
        }

        private async Task<InventoryCapacityCheckResult> ValidateInventoryCapacityForRewards(int playerId, IReadOnlyDictionary<int, int> itemRewards)
        {
            if (itemRewards.Count == 0)
            {
                return InventoryCapacityCheckResult.Ok();
            }

            var rewardItemIds = itemRewards.Keys.ToList();

            var itemsById = await _context.Items
                .AsNoTracking()
                .Where(item => rewardItemIds.Contains(item.IdItem))
                .ToDictionaryAsync(item => item.IdItem);

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
                return InventoryCapacityCheckResult.Fail("Inventory not found for player.");
            }

            foreach (var rewardEntry in itemRewards)
            {
                var itemId = rewardEntry.Key;
                var quantity = rewardEntry.Value;

                if (quantity <= 0)
                {
                    continue;
                }

                if (!itemsById.TryGetValue(itemId, out var item))
                {
                    return InventoryCapacityCheckResult.Fail($"Reward item {itemId} does not exist.");
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
                    return InventoryCapacityCheckResult.Fail(
                        $"Not enough inventory space to claim contract rewards ({item.Name}). Clear inventory slots and try again.");
                }
            }

            return InventoryCapacityCheckResult.Ok();
        }

        public sealed class AssignContractRequest
        {
            public int PlayerId { get; set; }

            public int ContractId { get; set; }
        }

        public sealed class AddPlayerContractProgressRequest
        {
            public int PlayerId { get; set; }

            public int ContractId { get; set; }

            public int AmountToAdd { get; set; } = 1;
        }

        public sealed class AddMobKillProgressRequest
        {
            public int PlayerId { get; set; }

            public int MobId { get; set; }

            public int AmountToAdd { get; set; } = 1;
        }

        public sealed class AddNodeMineProgressRequest
        {
            public int PlayerId { get; set; }

            public int NodeId { get; set; }

            public int AmountToAdd { get; set; } = 1;
        }

        public sealed class CompleteContractRequest
        {
            public int PlayerId { get; set; }

            public int ContractId { get; set; }
        }

        public sealed class CancelContractRequest
        {
            public int PlayerId { get; set; }

            public int ContractId { get; set; }
        }

        public sealed class PlayerContractSummaryResponse
        {
            public int PlayerContractId { get; set; }

            public int PlayerId { get; set; }

            public int ContractId { get; set; }

            public string ContractName { get; set; } = string.Empty;

            public string Difficulty { get; set; } = string.Empty;

            public string? SkillName { get; set; }

            public int ProgressCount { get; set; }

            public int TargetCount { get; set; }

            public bool IsReadyToComplete { get; set; }
        }

        public sealed class CompleteContractResponse
        {
            public int PlayerId { get; set; }

            public int ContractId { get; set; }

            public string ContractName { get; set; } = string.Empty;

            public bool Completed { get; set; }

            public int TotalXpAwarded { get; set; }

            public int TotalCoinsAwarded { get; set; }

            public int TotalContractPointsAwarded { get; set; }

            public List<ItemRewardAwarded> ItemRewardsAwarded { get; set; } = new();

            public List<RewardRollResult> RewardRolls { get; set; } = new();
        }

        public sealed class CancelContractResponse
        {
            public int PlayerId { get; set; }

            public int ContractId { get; set; }

            public int CancelCostContractPoints { get; set; }

            public int RemainingContractPoints { get; set; }

            public bool Cancelled { get; set; }
        }

        public sealed class ItemRewardAwarded
        {
            public int ItemId { get; set; }

            public int Quantity { get; set; }
        }

        public sealed class RewardRollResult
        {
            public int ContractRewardId { get; set; }

            public float Chance { get; set; }

            public bool Awarded { get; set; }

            public int? XpReward { get; set; }

            public int? CoinReward { get; set; }

            public int ContractPoints { get; set; }

            public int? ItemRewardId { get; set; }

            public string? ItemRewardName { get; set; }

            public int ItemRewardQuantity { get; set; }
        }

        private sealed class InventoryAddResult
        {
            public bool Success { get; private set; }

            public string ErrorMessage { get; private set; } = string.Empty;

            public static InventoryAddResult Ok() => new InventoryAddResult { Success = true };

            public static InventoryAddResult Fail(string errorMessage) => new InventoryAddResult
            {
                Success = false,
                ErrorMessage = errorMessage,
            };
        }

        private sealed class InventoryCapacityCheckResult
        {
            public bool Success { get; private set; }

            public string ErrorMessage { get; private set; } = string.Empty;

            public static InventoryCapacityCheckResult Ok() => new InventoryCapacityCheckResult { Success = true };

            public static InventoryCapacityCheckResult Fail(string errorMessage) => new InventoryCapacityCheckResult
            {
                Success = false,
                ErrorMessage = errorMessage,
            };
        }

        private sealed class InventoryCapacitySimulationSlot
        {
            public int? ItemId { get; set; }

            public int Quantity { get; set; }

            public bool HasItemInstance { get; set; }
        }
    }
}
