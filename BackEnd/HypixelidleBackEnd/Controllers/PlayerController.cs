using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;
using HypixelidleBackEnd.Controllers;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlayerController : ControllerBase
    {
        private readonly HypixelIdleContext _context;
        private readonly HashingService _hashingService;
        private readonly InventoryController _inventoryController;


        public PlayerController(HypixelIdleContext context, HashingService hashingService, InventoryController inventoryController)
        {
            _context = context;
            _hashingService = hashingService;
            _inventoryController = inventoryController;
        }

        [HttpGet]
        [Route("GetPlayer")]
        public async Task<ActionResult<Player>> GetPlayer(string username, string password)
        {
            var hashedPassword = _hashingService.HashPassword(password);

            var player = await _context.Players.FirstOrDefaultAsync(p => p.Username == username && p.Password == hashedPassword);

            if (player == null)
            {
                return NotFound();
            }

        
            return Ok(player);
        }

        [HttpPost]
        [Route("CreatePlayer")]
        public async Task<ActionResult<Player>> CreatePlayer(Player player)
        {
            string password = _hashingService.HashPassword(player.Password);
            player.Password = password;

            _context.Players.Add(player);
            await _context.SaveChangesAsync();

            if (player.IdPlayer == 0)
            {
                return BadRequest("Player ID not generated");
            }

            //This should create the initial inventory, but for now we create only slot for testing purposes
            await _inventoryController.CreateInventorySlot(player);

            return CreatedAtAction(nameof(GetPlayer), new { username = player.Username }, player);
        }

        [HttpDelete]
        [Route("DeletePlayer")]
        public async Task<ActionResult> DeletePlayer(int playerId)
        {
            var player = await _context.Players.FindAsync(playerId);

            if (player == null)
            {
                return NotFound();
            }

            _context.Players.Remove(player);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut]
        [Route("UpdatePlayer")]
        public async Task<ActionResult> UpdatePlayer(int playerId, Player updatedPlayer)
        {
            if (playerId != updatedPlayer.IdPlayer)
            {
                return BadRequest();
            }

            var player = await _context.Players.FindAsync(playerId);

            if (player == null)
            {
                return NotFound();
            }

            player.Username = updatedPlayer.Username;
            player.Email = updatedPlayer.Email;
            player.SkyblockLevel = updatedPlayer.SkyblockLevel;
            player.CurrentXp = updatedPlayer.CurrentXp;
            player.EnchantingLvl = updatedPlayer.EnchantingLvl;
            player.GardenXp = updatedPlayer.GardenXp;

            _context.Entry(player).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
               throw;
            }

            return NoContent();
        }





        
    }

}
