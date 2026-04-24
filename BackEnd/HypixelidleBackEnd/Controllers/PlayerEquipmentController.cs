using System.Linq;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HypixelidleBackEnd.Authentication;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PlayerEquipmentController : ControllerBase
    {
        private static readonly HashSet<string> ArmorCategories = new(StringComparer.OrdinalIgnoreCase)
        {
            "equipmentarmor",
        };

        private static readonly HashSet<string> JeweleryCategories = new(StringComparer.OrdinalIgnoreCase)
        {
            "equipmentjewelery",
        };

        private readonly HypixelIdleContext _context;

        public PlayerEquipmentController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetEquipmentTypes")]
        public async Task<ActionResult<List<Equipmenttype>>> GetEquipmentTypes()
        {
            var equipmentTypes = await _context.Equipmenttypes
                .AsNoTracking()
                .OrderBy(t => t.IdEquipmentTypes)
                .ToListAsync();

            return Ok(equipmentTypes);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetPlayerEquipment")]
        public async Task<ActionResult<List<PlayerEquipmentResponse>>> GetPlayerEquipment(int playerId)
        {
            var playerEquipment = await _context.Playerequipments
                .AsNoTracking()
                .Include(e => e.FkItemidItemNavigation)
                .Include(e => e.SlotNavigation)
                .Where(e => e.FkPlayeridPlayer == playerId)
                .OrderBy(e => e.Slot)
                .Select(e => new PlayerEquipmentResponse
                {
                    IdPlayerEquipment = e.IdPlayerEquipment,
                    Slot = e.Slot,
                    FkPlayeridPlayer = e.FkPlayeridPlayer,
                    FkItemidItem = e.FkItemidItem,
                    SlotNavigation = e.SlotNavigation == null
                        ? null
                        : new EquipmentTypeResponse
                        {
                            IdEquipmentTypes = e.SlotNavigation.IdEquipmentTypes,
                            Name = e.SlotNavigation.Name,
                        },
                    FkItemidItemNavigation = e.FkItemidItemNavigation == null
                        ? null
                        : new ItemLiteResponse
                        {
                            IdItem = e.FkItemidItemNavigation.IdItem,
                            Name = e.FkItemidItemNavigation.Name,
                            Category = e.FkItemidItemNavigation.Category,
                            Icon = e.FkItemidItemNavigation.Icon,
                        },
                })
                .ToListAsync();

            return Ok(playerEquipment);
        }

        [HttpPost]
        [Route("EquipPlayerItem")]
        public async Task<ActionResult> EquipPlayerItem([FromBody] EquipPlayerItemRequest request)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            if (request.PlayerId <= 0 || request.InventorySlotId <= 0)
            {
                return BadRequest("PlayerId and InventorySlotId must be greater than zero.");
            }

            var inventorySlot = await _context.Playerinventoryslots
                .Include(slot => slot.FkItemidItemNavigation)
                .FirstOrDefaultAsync(slot => slot.IdPlayerInventorySlots == request.InventorySlotId && slot.FkPlayeridPlayer == request.PlayerId);

            if (inventorySlot == null)
            {
                return NotFound("Inventory slot not found.");
            }

            var item = inventorySlot.FkItemidItemNavigation;
            if (item == null || inventorySlot.Quantity <= 0)
            {
                return BadRequest("Inventory slot does not contain an item.");
            }

            var equipmentSlotName = await ResolveEquipmentSlotNameAsync(item);
            if (equipmentSlotName == null)
            {
                return BadRequest("Item cannot be equipped.");
            }

            var equipmentTypeId = await ResolveEquipmentTypeIdAsync(equipmentSlotName);
            if (equipmentTypeId == null)
            {
                return NotFound($"Equipment slot '{equipmentSlotName}' was not found.");
            }

            var existingEquipment = await _context.Playerequipments.FirstOrDefaultAsync(e =>
                e.FkPlayeridPlayer == request.PlayerId && e.Slot == equipmentTypeId.Value);

            if (existingEquipment != null && existingEquipment.FkItemidItem != null)
            {
                return Conflict("That equipment slot is already occupied. Unequip it first.");
            }

            var removed = await TryRemoveItemFromInventoryAsync(request.PlayerId, item.IdItem, 1);
            if (!removed)
            {
                return Conflict("Could not remove item from inventory.");
            }

            if (existingEquipment == null)
            {
                existingEquipment = new Playerequipment
                {
                    IdPlayerEquipment = await GetNextPlayerEquipmentIdAsync(),
                    FkPlayeridPlayer = request.PlayerId,
                    Slot = equipmentTypeId.Value,
                    FkItemidItem = item.IdItem,
                };

                _context.Playerequipments.Add(existingEquipment);
            }
            else
            {
                existingEquipment.FkItemidItem = item.IdItem;
            }

            await _context.SaveChangesAsync();
            return Ok(existingEquipment);
        }

        [HttpPost]
        [Route("UnequipPlayerItem")]
        public async Task<ActionResult> UnequipPlayerItem([FromBody] UnequipPlayerItemRequest request)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, request.PlayerId))
            {
                return Unauthorized();
            }

            if (request.PlayerId <= 0 || request.EquipmentSlotId <= 0)
            {
                return BadRequest("PlayerId and EquipmentSlotId must be greater than zero.");
            }

            var equipment = await _context.Playerequipments.FirstOrDefaultAsync(e =>
                e.FkPlayeridPlayer == request.PlayerId && e.Slot == request.EquipmentSlotId);

            if (equipment == null)
            {
                return NotFound("Equipment slot not found.");
            }

            if (equipment.FkItemidItem == null)
            {
                return BadRequest("Equipment slot is already empty.");
            }

            var itemId = equipment.FkItemidItem.Value;
            var returned = await TryAddItemToInventoryAsync(request.PlayerId, itemId, 1);
            if (!returned)
            {
                return Conflict("Could not return item to inventory.");
            }

            equipment.FkItemidItem = null;
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPut]
        [Route("UpdatePlayerEquipment")]
        public async Task<ActionResult> UpdatePlayerEquipment(int playerId, Playerequipment updatedEquipment)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, playerId))
            {
                return Unauthorized();
            }

            var playerEquipment = await _context.Playerequipments.FirstOrDefaultAsync(e =>
                e.FkPlayeridPlayer == playerId && e.Slot == updatedEquipment.Slot);

            if (playerEquipment == null)
            {
                return NotFound();
            }

            playerEquipment.FkItemidItem = updatedEquipment.FkItemidItem;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static string? Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
        }

        private async Task<string?> ResolveEquipmentSlotNameAsync(Item item)
        {
            var category = Normalize(item.Category);
            var name = Normalize(item.Name);

            if (category == null || name == null)
            {
                return null;
            }

            if (!ArmorCategories.Contains(category) && !JeweleryCategories.Contains(category))
            {
                return null;
            }

            var equipmentTypes = await _context.Equipmenttypes
                .AsNoTracking()
                .OrderBy(type => type.IdEquipmentTypes)
                .ToListAsync();

            foreach (var equipmentType in equipmentTypes)
            {
                var normalizedSlotName = Normalize(equipmentType.Name);
                if (NameMatchesSlot(name, normalizedSlotName))
                {
                    return equipmentType.Name;
                }
            }

            return null;
        }

        private static bool NameMatchesSlot(string normalizedItemName, string? normalizedSlotName)
        {
            if (string.IsNullOrWhiteSpace(normalizedItemName) || string.IsNullOrWhiteSpace(normalizedSlotName))
            {
                return false;
            }

            if (normalizedItemName.Contains(normalizedSlotName))
            {
                return true;
            }

            if (normalizedSlotName.EndsWith("s"))
            {
                var singular = normalizedSlotName[..^1];
                return !string.IsNullOrWhiteSpace(singular) && normalizedItemName.Contains(singular);
            }

            return normalizedItemName.Contains($"{normalizedSlotName}s");
        }

        private async Task<int?> ResolveEquipmentTypeIdAsync(string equipmentSlotName)
        {
            var normalizedSlotName = Normalize(equipmentSlotName);
            if (normalizedSlotName == null)
            {
                return null;
            }

            var equipmentTypes = await _context.Equipmenttypes
                .AsNoTracking()
                .ToListAsync();

            var equipmentType = equipmentTypes
                .FirstOrDefault(type => Normalize(type.Name) == normalizedSlotName);

            return equipmentType?.IdEquipmentTypes;
        }

        private async Task<int> GetNextPlayerEquipmentIdAsync()
        {
            var currentMax = await _context.Playerequipments.MaxAsync(e => (int?)e.IdPlayerEquipment) ?? 0;
            return currentMax + 1;
        }

        private async Task<bool> TryRemoveItemFromInventoryAsync(int playerId, int itemId, int quantity)
        {
            var inventorySlots = await _context.Playerinventoryslots
                .Where(slot => slot.FkPlayeridPlayer == playerId && slot.FkItemidItem == itemId)
                .OrderBy(slot => slot.SlotIndex)
                .ToListAsync();

            var remainingQuantity = quantity;

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
                return false;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        private async Task<bool> TryAddItemToInventoryAsync(int playerId, int itemId, int quantity)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.IdItem == itemId);
            if (item == null)
            {
                return false;
            }

            var inventorySlots = await _context.Playerinventoryslots
                .Where(slot => slot.FkPlayeridPlayer == playerId)
                .OrderBy(slot => slot.SlotIndex)
                .ToListAsync();

            var maxStackSize = item.Stackable ? Math.Max(1, item.StackValue) : 1;
            var remainingQuantity = quantity;

            foreach (var slot in inventorySlots.Where(slot => slot.FkItemidItem == itemId && slot.Quantity < maxStackSize))
            {
                var freeSpace = maxStackSize - slot.Quantity;
                var toAdd = Math.Min(remainingQuantity, freeSpace);

                slot.Quantity += toAdd;
                remainingQuantity -= toAdd;

                if (remainingQuantity == 0)
                {
                    await _context.SaveChangesAsync();
                    return true;
                }
            }

            foreach (var slot in inventorySlots.Where(slot => slot.FkItemidItem == null && slot.Quantity <= 0))
            {
                var toAdd = Math.Min(remainingQuantity, maxStackSize);

                slot.FkItemidItem = itemId;
                slot.Quantity = toAdd;

                remainingQuantity -= toAdd;

                if (remainingQuantity == 0)
                {
                    await _context.SaveChangesAsync();
                    return true;
                }
            }

            return false;
        }

        public sealed class EquipPlayerItemRequest
        {
            public int PlayerId { get; set; }

            public int InventorySlotId { get; set; }
        }

        public sealed class UnequipPlayerItemRequest
        {
            public int PlayerId { get; set; }

            public int EquipmentSlotId { get; set; }
        }

        public sealed class PlayerEquipmentResponse
        {
            public int IdPlayerEquipment { get; set; }

            public int Slot { get; set; }

            public int FkPlayeridPlayer { get; set; }

            public int? FkItemidItem { get; set; }

            public EquipmentTypeResponse? SlotNavigation { get; set; }

            public ItemLiteResponse? FkItemidItemNavigation { get; set; }
        }

        public sealed class EquipmentTypeResponse
        {
            public int IdEquipmentTypes { get; set; }

            public string Name { get; set; } = string.Empty;
        }

        public sealed class ItemLiteResponse
        {
            public int IdItem { get; set; }

            public string Name { get; set; } = string.Empty;

            public string Category { get; set; } = string.Empty;

            public string? Icon { get; set; }
        }
    }
}