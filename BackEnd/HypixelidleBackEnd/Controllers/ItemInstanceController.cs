using HypixelidleBackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;


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
        //update auth later
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
        //update auth later
        [AllowAnonymous]
        [Route("AddItemInstance")]
        public async Task<ActionResult<Iteminstance>> AddItemInstance(Iteminstance itemInstance)
        {
            _context.Iteminstances.Add(itemInstance);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetItemInstances), new { id = itemInstance.IdItemInstance }, itemInstance);
            
        }

        [HttpPost]
        //update auth later
        [AllowAnonymous]
        [Route("AddItemInstanceToInventory")]
        public async Task<ActionResult> AddItemInstanceToInventory(int itemInstanceId, int inventorySlotId)
        {
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

    }
}