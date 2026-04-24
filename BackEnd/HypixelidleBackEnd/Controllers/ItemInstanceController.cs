using HypixelidleBackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HypixelidleBackEnd.Authentication;


namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ItemInstanceController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public ItemInstanceController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetItemInstances")]
        public async Task<ActionResult<List<Iteminstance>>> GetItemInstances()
        {
            var itemInstances = await _context.Iteminstances.ToListAsync();

            if (itemInstances == null)
            {
                return NotFound();
            }

            return Ok(itemInstances);
        }

        [HttpPost]
        [Route("AddItemInstance")]
        public async Task<ActionResult<Iteminstance>> AddItemInstance(Iteminstance itemInstance)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }
            _context.Iteminstances.Add(itemInstance);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetItemInstances), new { id = itemInstance.IdItemInstance }, itemInstance);
            
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("AddItemInstanceToInventory")]
        public async Task<ActionResult> AddItemInstanceToInventory(int itemInstanceId, int inventorySlotId)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }
            var itemInstance = await _context.Iteminstances.FindAsync(itemInstanceId);
            var inventorySlot = await _context.Playerinventoryslots.FindAsync(inventorySlotId);

            if (itemInstance == null || inventorySlot == null)
            {
                return NotFound();
            }

            var slotAlreadyOccupied = await _context.Iteminstances.AnyAsync(i =>
                i.FkPlayerInventorySlotsidPlayerInventorySlots == inventorySlotId &&
                i.IdItemInstance != itemInstanceId);

            if (slotAlreadyOccupied)
            {
                return Conflict("Inventory slot is already occupied.");
            }

            itemInstance.FkPlayerInventorySlotsidPlayerInventorySlots = inventorySlotId;

            if (inventorySlot.Quantity <= 0)
            {
                inventorySlot.Quantity = 1;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete]
        [Route("RemoveItemInstanceFromInventory")]
        public async Task<ActionResult> RemoveItemInstanceFromInventory(int itemInstanceId, int playerId)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, playerId))
            {
                return Unauthorized();
            }

            var itemInstance = await _context.Iteminstances
                .Include(i => i.FkItemidItemNavigation)
                .Include(i => i.FkPlayerInventorySlotsidPlayerInventorySlotsNavigation)
                .FirstOrDefaultAsync(i => i.IdItemInstance == itemInstanceId);

            if (itemInstance == null)
                return NotFound("Item instance not found.");

            if (itemInstance.FkPlayerInventorySlotsidPlayerInventorySlots == null)
                return BadRequest("Item instance is not in a player inventory slot.");

            var inventorySlot = itemInstance.FkPlayerInventorySlotsidPlayerInventorySlotsNavigation;
            if (inventorySlot?.FkPlayeridPlayer != playerId)
                return Unauthorized("Item does not belong to this player.");

            var item = itemInstance.FkItemidItemNavigation;
            if (item == null || !item.SellValue.HasValue)
                return BadRequest("Item cannot be sold.");

            var sellValue = item.SellValue.Value;

            var purse = await _context.Purses.FirstOrDefaultAsync(p => p.FkPlayeridPlayer == playerId);
            if (purse == null)
                return NotFound("Player purse not found.");

            _context.Iteminstances.Remove(itemInstance);
            inventorySlot.FkItemidItem = null;
            purse.Balance += sellValue;

            await _context.SaveChangesAsync();
            return Ok(new { sellValue = sellValue });
        }

    }
}