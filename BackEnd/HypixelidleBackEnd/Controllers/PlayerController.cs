using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlayerController : ControllerBase
    {
        private readonly HypixelIdleContext _context;
        private readonly HashingService _hashingService;

        public PlayerController(HypixelIdleContext context, HashingService hashingService)
        {
            _context = context;
            _hashingService = hashingService;
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

            return CreatedAtAction(nameof(GetPlayer), new { username = player.Username }, player);
        }





        
    }

}
