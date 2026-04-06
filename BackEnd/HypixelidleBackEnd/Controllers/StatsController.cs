using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //dont forget to auth and authorize later
    //[Authorize]
    public class StatsController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public StatsController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetStats")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Stat>>> GetStats()
        {
            var stats = await _context.Stats.ToListAsync();

            if (stats == null)
            {
                return NotFound();
            }

            return Ok(stats);
        }

        [HttpPost]
        [Route("AddStat")]
        public async Task<ActionResult<Stat>> AddStat(Stat stat)
        {
            _context.Stats.Add(stat);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStats), new { id = stat.IdStats }, stat);
        }

        [HttpGet]
        [Route("GetEntityStats")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Entitystat>>> GetEntityStats(int entityId)
        {
            var entityStats = await _context.Entitystats.Where(s => s.IdEntityStats == entityId).ToListAsync();

            if (entityStats == null)
            {
                return NotFound();
            }

            return Ok(entityStats);
        }

        [HttpPost]
        [Route("AddEntityStat")]
        public async Task<ActionResult<Entitystat>> AddEntityStat(Entitystat entityStat)
        {
            _context.Entitystats.Add(entityStat);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEntityStats), new { id = entityStat.IdEntityStats }, entityStat);
        }
        

        [HttpGet]
        [Route("GetItemStats")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Entitystat>>> GetItemStats(int itemId)
        {
            var itemStats = await _context.Entitystats.Where(s => s.FkItemidItem == itemId).ToListAsync();

            if (itemStats == null)
            {
                return NotFound();
            }

            return Ok(itemStats);
        }

        [HttpPut]
        [Route("UpdateStat")]
        public async Task<ActionResult> UpdateStat(int statId, Entitystat newStat)
        {
            var entityStats = await _context.Entitystats.FindAsync(statId);

            if (entityStats == null)
            {
                return NotFound();
            }

            entityStats = newStat;
            
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet]
        [Route("GetPlayerStats")]
        public async Task<ActionResult<List<Entitystat>>> GetPlayerStats(int playerId)
        {
            var playerStats = await _context.Entitystats
                .AsNoTracking()
                .Include(s => s.FkStatsidStatsNavigation)
                .Where(s => s.FkPlayeridPlayer == playerId)
                .ToListAsync();

            if (playerStats == null)
            {
                return NotFound();
            }

            return Ok(playerStats);
        }

        [HttpGet]
        [Route("GetMobStats")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Entitystat>>> GetMobStats(int mobId)
        {
            var mobStats = await _context.Entitystats
                .AsNoTracking()
                .Where(s => s.FkMobidMob == mobId)
                .ToListAsync();

            if (mobStats == null)
            {
                return NotFound();
            }

            return Ok(mobStats);
        }
    }

}