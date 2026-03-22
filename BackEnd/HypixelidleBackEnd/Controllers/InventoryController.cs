using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;

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
        [Route("GetInventory")]
        public async Task<ActionResult<Playerinventoryslot>> GetInventorySlots(int playerId)
        {
            var inventorySlots = await _context.Playerinventoryslots.Where(i => i.FkPlayeridPlayer == playerId).ToListAsync();

            if (inventorySlots == null)
            {
                return NotFound();
            }

            return Ok(inventorySlots);
        }

        //Pretty much useless, only used to test in the initial phase of dev
        [HttpPost]
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
        }

        [HttpPost]
        [Route("CreateInitialInventory")]
        public async Task<ActionResult> CreateInitialInventory(int playerId)
        {
            for (int i = 0; i < 27; i++)
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

    }
}