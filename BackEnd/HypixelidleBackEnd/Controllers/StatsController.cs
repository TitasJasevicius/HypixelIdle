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
    public class StatsController : ControllerBase
    {
        private readonly HypixelIdleContext _context;
        public StatsController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetStats")]
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

            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            _context.Stats.Add(stat);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStats), new { id = stat.IdStats }, stat);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetEntityStats")]
        public async Task<ActionResult<List<EntityStatResponse>>> GetEntityStats(int entityId)
        {
            var entityStats = await _context.Entitystats
                .AsNoTracking()
                .Where(s => s.IdEntityStats == entityId)
                .Select(s => new EntityStatResponse
                {
                    IdEntityStats = s.IdEntityStats,
                    Value = s.Value,
                    PercentageValue = s.PercentageValue,
                    FkStatsidStats = s.FkStatsidStats,
                    FkPlayeridPlayer = s.FkPlayeridPlayer,
                    FkItemidItem = s.FkItemidItem,
                    FkMobidMob = s.FkMobidMob,
                })
                .ToListAsync();

            if (entityStats.Count == 0)
            {
                return NotFound();
            }

            return Ok(entityStats);
        }

        [HttpPost]
        [Route("AddEntityStat")]
        public async Task<ActionResult<Entitystat>> AddEntityStat(Entitystat entityStat)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            _context.Entitystats.Add(entityStat);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEntityStats), new { id = entityStat.IdEntityStats }, entityStat);
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("InitializePlayerStats")]
        public async Task<ActionResult> InitializePlayerStats(int playerId)
        {
           var defaultStats = await _context.Stats.ToListAsync();

            if (defaultStats == null || defaultStats.Count == 0)
            {
                return NotFound("No stats found to initialize.");
            }

            var playerStats = defaultStats.Select(stat => new Entitystat
            {
                Value = null,
                PercentageValue = null,
                FkStatsidStats = stat.IdStats,
                FkPlayeridPlayer = playerId,
                FkItemidItem = null,
                FkMobidMob = null
            }).ToList();

            _context.Entitystats.AddRange(playerStats);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("InitializePlayerHealth")]
        public async Task<ActionResult> InitializePlayerHealth(int playerId, int defaultHealth)
        {
            var healthStat = await _context.Stats.FirstOrDefaultAsync(s => s.Name == "Health");

            if (healthStat == null)
            {
                return NotFound("Health stat not found.");
            }

            var playerHealthStat = new Entitystat
            {
                Value = defaultHealth,
                PercentageValue = null,
                FkStatsidStats = healthStat.IdStats,
                FkPlayeridPlayer = playerId,
                FkItemidItem = null,
                FkMobidMob = null
            };

            _context.Entitystats.Add(playerHealthStat);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        



        [HttpGet]
        [AllowAnonymous]
        [Route("GetItemStats")]
        public async Task<ActionResult<List<EntityStatResponse>>> GetItemStats(int itemId)
        {
            var itemStats = await _context.Entitystats
                .AsNoTracking()
                .Where(s => s.FkItemidItem == itemId)
                .Select(s => new EntityStatResponse
                {
                    IdEntityStats = s.IdEntityStats,
                    Value = s.Value,
                    PercentageValue = s.PercentageValue,
                    FkStatsidStats = s.FkStatsidStats,
                    FkPlayeridPlayer = s.FkPlayeridPlayer,
                    FkItemidItem = s.FkItemidItem,
                    FkMobidMob = s.FkMobidMob,
                })
                .ToListAsync();

            if (itemStats.Count == 0)
            {
                return NotFound();
            }

            return Ok(itemStats);
        }

        [HttpPut]
        [Route("UpdateStat")]
        public async Task<ActionResult> UpdateStat(int statId, Entitystat newStat)
        {

            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

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
        [AllowAnonymous]
        [Route("GetPlayerStats")]
        public async Task<ActionResult<List<EntityStatResponse>>> GetPlayerStats(int playerId)
        {
            var playerStats = await _context.Entitystats
                .AsNoTracking()
                .Where(s => s.FkPlayeridPlayer == playerId)
                .Select(s => new EntityStatResponse
                {
                    IdEntityStats = s.IdEntityStats,
                    Value = s.Value,
                    PercentageValue = s.PercentageValue,
                    FkStatsidStats = s.FkStatsidStats,
                    FkPlayeridPlayer = s.FkPlayeridPlayer,
                    FkItemidItem = s.FkItemidItem,
                    FkMobidMob = s.FkMobidMob,
                })
                .ToListAsync();

            if (playerStats.Count == 0)
            {
                return NotFound();
            }

            return Ok(playerStats);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetMobStats")]
        public async Task<ActionResult<List<EntityStatResponse>>> GetMobStats(int mobId)
        {
            var mobStats = await _context.Entitystats
                .AsNoTracking()
                .Where(s => s.FkMobidMob == mobId)
                .Select(s => new EntityStatResponse
                {
                    IdEntityStats = s.IdEntityStats,
                    Value = s.Value,
                    PercentageValue = s.PercentageValue,
                    FkStatsidStats = s.FkStatsidStats,
                    FkPlayeridPlayer = s.FkPlayeridPlayer,
                    FkItemidItem = s.FkItemidItem,
                    FkMobidMob = s.FkMobidMob,
                })
                .ToListAsync();

            if (mobStats.Count == 0)
            {
                return NotFound();
            }

            return Ok(mobStats);
        }

        [HttpDelete]
        [Route("DeletePlayerStats")]
        public async Task<ActionResult> DeletePlayerStats(int playerId)
        {

            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            var playerStats = await _context.Entitystats.Where(s => s.FkPlayeridPlayer == playerId).ToListAsync();

            if (playerStats.Count == 0)
            {
                return NotFound();
            }

            _context.Entitystats.RemoveRange(playerStats);
            await _context.SaveChangesAsync();

            return NoContent();
            
        }

        

        public sealed class EntityStatResponse
        {
            public int IdEntityStats { get; init; }

            public int? Value { get; init; }

            public float? PercentageValue { get; init; }

            public int FkStatsidStats { get; init; }

            public int? FkPlayeridPlayer { get; init; }

            public int? FkItemidItem { get; init; }

            public int? FkMobidMob { get; init; }
        }
    }

}