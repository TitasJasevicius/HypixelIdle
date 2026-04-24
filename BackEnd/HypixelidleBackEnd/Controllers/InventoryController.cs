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
    public class InventoryController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public InventoryController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetInventory")]
        public async Task<ActionResult<IEnumerable<InventorySlotResponse>>> GetInventorySlots(int playerId)
        {
            var inventorySlots = await _context.Playerinventoryslots
                .AsNoTracking()
                .Where(i => i.FkPlayeridPlayer == playerId)
                .Include(i => i.FkItemidItemNavigation)
                .OrderBy(i => i.SlotIndex)
                .Select(i => new InventorySlotResponse
                {
                    IdPlayerInventorySlots = i.IdPlayerInventorySlots,
                    SlotIndex = i.SlotIndex,
                    Quantity = i.Quantity,
                    FkItemidItem = i.FkItemidItem,
                    ItemName = i.FkItemidItemNavigation != null ? i.FkItemidItemNavigation.Name : null,
                    ItemCategory = i.FkItemidItemNavigation != null ? i.FkItemidItemNavigation.Category : null,
                    ItemIcon = i.FkItemidItemNavigation != null ? i.FkItemidItemNavigation.Icon : null,
                    SellValue = i.FkItemidItemNavigation != null ? i.FkItemidItemNavigation.SellValue : null
                })
                .ToListAsync();

            if (inventorySlots == null)
            {
                return NotFound();
            }

            return Ok(inventorySlots);
        }

        /*//Pretty much useless, only used to test in the initial phase of dev
        [HttpPost]
        //update auth later
        [AllowAnonymous]
        [Route("CreateInventorySlot")]
        public async Task<ActionResult<Playerinventoryslot>> CreateInventorySlot(Player player)
        {
            var newSlot = new Playerinventoryslot
            {
                SlotIndex = 0,
                Quantity = 0,
                FkPlayeridPlayer = player.IdPlayer
            };
            
            _context.Playerinventoryslots.Add(newSlot);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetInventorySlots), new { playerId = newSlot.FkPlayeridPlayer }, newSlot);
        }*/

        [HttpPost]
        [AllowAnonymous]
        [Route("CreateInitialInventory")]
        public async Task<ActionResult> CreateInitialInventory(int playerId)
        {
            for (int i = 0; i < 36; i++)
            {
                var inventorySlot = new Playerinventoryslot
                {
                    SlotIndex = i,
                    Quantity = 0,
                    FkPlayeridPlayer = playerId
                };

                _context.Playerinventoryslots.Add(inventorySlot);
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetInventorySlots), new { playerId = playerId }, null);
        }

        [HttpPost]
        [Route("AddItemToInventory")]
        public async Task<ActionResult> AddItemToInventory([FromBody] AddItemToInventoryRequest request)
        {
            if (request.PlayerId <= 0 || request.ItemId <= 0 || request.Quantity <= 0)
            {
                return BadRequest("PlayerId, ItemId and Quantity must be greater than zero.");
            }

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            var item = await _context.Items.FirstOrDefaultAsync(i => i.IdItem == request.ItemId);
            if (item == null)
            {
                return NotFound("Item not found.");
            }

            var inventorySlots = await _context.Playerinventoryslots
                .Include(slot => slot.Iteminstance)
                .Where(slot => slot.FkPlayeridPlayer == request.PlayerId)
                .OrderBy(slot => slot.SlotIndex)
                .ToListAsync();

            if (inventorySlots.Count == 0)
            {
                return NotFound("Inventory not found for player.");
            }

            var maxStackSize = item.Stackable ? Math.Max(1, item.StackValue) : 1;
            var remainingQuantity = request.Quantity;

            foreach (var slot in inventorySlots.Where(slot =>
                         slot.FkItemidItem == request.ItemId
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

                    slot.FkItemidItem = request.ItemId;
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
                return Conflict($"Inventory is full. Could not add {remainingQuantity} item(s).");
            }

            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPost]
        [Route("RemoveItemFromInventory")]
        public async Task<ActionResult> RemoveItemFromInventory([FromBody] RemoveItemFromInventoryRequest request)
        {
            if (request.PlayerId <= 0 || request.ItemId <= 0 || request.Quantity <= 0)
            {
                return BadRequest("PlayerId, ItemId and Quantity must be greater than zero.");
            }

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            var item = await _context.Items.FirstOrDefaultAsync(i => i.IdItem == request.ItemId);
            if (item == null)
            {
                return NotFound("Item not found.");
            }

            var inventorySlots = await _context.Playerinventoryslots
                .Where(slot => slot.FkPlayeridPlayer == request.PlayerId && slot.FkItemidItem == request.ItemId)
                .OrderBy(slot => slot.SlotIndex)
                .ToListAsync();

            if (inventorySlots.Count == 0)
            {
                return NotFound("Item not found in inventory.");
            }

            var remainingQuantity = request.Quantity;

            foreach (var slot in inventorySlots)
            {
                if (remainingQuantity <= 0)
                {
                    break;
                }

                var toRemove = Math.Min(remainingQuantity, slot.Quantity);
                slot.Quantity -= toRemove;
                remainingQuantity -= toRemove;

                if (slot.Quantity <= 0)
                {
                    slot.FkItemidItem = null;
                }
            }

            if (remainingQuantity > 0)
            {
                return Conflict($"Inventory does not have enough items. Missing {remainingQuantity} item(s).");
            }

            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPost]
        [Route("SellInventoryItem")]
        public async Task<ActionResult<SellInventoryItemResponse>> SellInventoryItem([FromBody] SellInventoryItemRequest request)
        {
            if (request.PlayerId <= 0 || request.InventorySlotId <= 0 || request.Quantity <= 0)
            {
                return BadRequest("PlayerId, InventorySlotId and Quantity must be greater than zero.");
            }

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            var inventorySlot = await _context.Playerinventoryslots
                .Include(slot => slot.FkItemidItemNavigation)
                .FirstOrDefaultAsync(slot =>
                    slot.IdPlayerInventorySlots == request.InventorySlotId &&
                    slot.FkPlayeridPlayer == request.PlayerId);

            if (inventorySlot == null)
            {
                return NotFound("Inventory slot not found.");
            }

            if (inventorySlot.FkItemidItem == null || inventorySlot.Quantity <= 0)
            {
                return Conflict("No sellable item in this inventory slot.");
            }

            if (request.ItemId.HasValue && request.ItemId.Value != inventorySlot.FkItemidItem.Value)
            {
                return Conflict("Selected item no longer matches this slot.");
            }

            if (inventorySlot.Quantity < request.Quantity)
            {
                return Conflict($"Inventory slot does not have enough items. Missing {request.Quantity - inventorySlot.Quantity} item(s).");
            }

            var itemSellValue = inventorySlot.FkItemidItemNavigation?.SellValue ?? 0;
            if (itemSellValue <= 0)
            {
                return Conflict("This item cannot be sold.");
            }

            var soldQuantity = request.Quantity;
            var coinsAwarded = soldQuantity * itemSellValue;

            inventorySlot.Quantity -= soldQuantity;
            if (inventorySlot.Quantity <= 0)
            {
                inventorySlot.Quantity = 0;
                inventorySlot.FkItemidItem = null;
            }

            var purse = await _context.Purses.FirstOrDefaultAsync(p => p.FkPlayeridPlayer == request.PlayerId);
            if (purse == null)
            {
                purse = new Purse
                {
                    IdPurse = (await _context.Purses.MaxAsync(p => (int?)p.IdPurse) ?? 0) + 1,
                    FkPlayeridPlayer = request.PlayerId,
                    Balance = 0,
                    Bits = 0,
                };

                _context.Purses.Add(purse);
            }

            purse.Balance += coinsAwarded;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new SellInventoryItemResponse
            {
                CoinsAwarded = coinsAwarded,
                SoldQuantity = soldQuantity,
                RemainingQuantityInSlot = inventorySlot.Quantity,
            });
        }
        
        [HttpPut]
        [Route("UpdateInventorySlot")]
        public async Task<ActionResult> UpdateInventorySlot(int inventorySlotId, int quantity)
        {
            var inventorySlot = await _context.Playerinventoryslots.FindAsync(inventorySlotId);

            if (inventorySlot == null)
            {
                return NotFound();
            }

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, inventorySlot.FkPlayeridPlayer))
            {
                return Unauthorized();
            }

            if (quantity < 0)
            {
                return BadRequest("Quantity cannot be negative.");
            }

            inventorySlot.Quantity = quantity;

            if (quantity == 0)
            {
                inventorySlot.FkItemidItem = null;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete]

        [Route("DeleteInventorySlots")]
        public async Task<ActionResult> DeleteInventorySlots(int playerId)
        {
            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, playerId))
            {
                return Unauthorized();
            }

            var inventorySlots = await _context.Playerinventoryslots.Where(slot => slot.FkPlayeridPlayer == playerId).ToListAsync();

            if (inventorySlots.Count == 0)
            {
                return NotFound();
            }

            _context.Playerinventoryslots.RemoveRange(inventorySlots);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        


        public sealed class AddItemToInventoryRequest
        {
            public int PlayerId { get; set; }

            public int ItemId { get; set; }

            public int Quantity { get; set; } = 1;
        }

        public sealed class RemoveItemFromInventoryRequest
        {
            public int PlayerId { get; set; }

            public int ItemId { get; set; }

            public int Quantity { get; set; } = 1;
        }

        public sealed class SellInventoryItemRequest
        {
            public int PlayerId { get; set; }

            public int InventorySlotId { get; set; }

            public int? ItemId { get; set; }

            public int Quantity { get; set; } = 1;
        }

        public sealed class SellInventoryItemResponse
        {
            public int CoinsAwarded { get; set; }

            public int SoldQuantity { get; set; }

            public int RemainingQuantityInSlot { get; set; }
        }

        public sealed class InventorySlotResponse
        {
            public int IdPlayerInventorySlots { get; set; }

            public int SlotIndex { get; set; }

            public int Quantity { get; set; }

            public int? FkItemidItem { get; set; }

            public string? ItemName { get; set; }

            public string? ItemCategory { get; set; }

            public string? ItemIcon { get; set; }

            public int? SellValue { get; set; }
        }

    }
}