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
    public class MobController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public MobController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetMobs")]
        public async Task<ActionResult<List<Mob>>> GetMobs()
        {
            var mobs = await _context.Mobs.ToListAsync();

            if (mobs == null)
            {
                return NotFound();
            }

            return Ok(mobs);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetMob")]
        public async Task<ActionResult<Mob>> GetMob(int id)
        {
            var mob = await _context.Mobs.FindAsync(id);

            if (mob == null)
            {
                return NotFound();
            }

            return Ok(mob);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetMobInstances")]
        public async Task<ActionResult<List<Mobinstance>>> GetMobInstances()
        {
            var mobInstances = await _context.Mobinstances.ToListAsync();

            if (mobInstances == null)
            {
                return NotFound();
            }

            return Ok(mobInstances);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetMobInstance")]
        public async Task<ActionResult<Mobinstance>> GetMobInstance(int id)
        {
            var mobInstance = await _context.Mobinstances.FindAsync(id);

            if (mobInstance == null)
            {
                return NotFound();
            }

            return Ok(mobInstance);
        }

        [HttpPost]
        [Route("AddMob")]
        public async Task<ActionResult<Mob>> AddMob(Mob mob)
        {

            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            _context.Mobs.Add(mob);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMob), new { id = mob.IdMob }, mob);
        }

        [HttpPost]
        [Route("AddMobInstance")]
        public async Task<ActionResult<Mobinstance>> AddMobInstance(Mobinstance mobInstance)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            _context.Mobinstances.Add(mobInstance);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMobInstance), new { id = mobInstance.IdMobInstance }, mobInstance);
        }

        [HttpPut]
        [Route("UpdateMobInstance")]
        public async Task<ActionResult> UpdateMobInstance(int mobInstanceId, Mobinstance updatedMobInstance)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }
            var mobInstance = await _context.Mobinstances.FindAsync(mobInstanceId);

            if (mobInstance == null)
            {
                return NotFound();
            }

            mobInstance.FkMobidMob = updatedMobInstance.FkMobidMob;
            mobInstance.CurrentHealth = updatedMobInstance.CurrentHealth;
            mobInstance.LastUpdate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut]
        [Route("UpdateMob")]
        public async Task<ActionResult> UpdateMob(int mobId, Mob updatedMob)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            var mob = await _context.Mobs.FindAsync(mobId);

            if (mob == null)
            {
                return NotFound();
            }

            mob = updatedMob;
            await _context.SaveChangesAsync();

            return NoContent();   
        }

        [HttpDelete]
        [Route("DeleteMob")]
        public async Task<ActionResult> DeleteMob(int id)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            var mob = await _context.Mobs.FindAsync(id);

            if (mob == null)
            {
                return NotFound();
            }

            _context.Mobs.Remove(mob);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete]
        [Route("DeleteMobInstance")]
        public async Task<ActionResult> DeleteMobInstance(int id)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }
            var mobInstance = await _context.Mobinstances.FindAsync(id);

            if (mobInstance == null)
            {
                return NotFound();
            }

            _context.Mobinstances.Remove(mobInstance);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetCombatMobs")]
        public async Task<ActionResult<List<CombatMobResponse>>> GetCombatMobs()
        {
            var mobEntities = await _context.Mobs
                .AsNoTracking()
                .Include(m => m.SkillXpTypeNavigation)
                .Include(m => m.FkMobDropTableidMobDropTables)
                    .ThenInclude(d => d.FkItemidItemNavigation)
                .OrderBy(m => m.IdMob)
                .ToListAsync();

            var mobs = mobEntities.Select(m => new CombatMobResponse
            {
                IdMob = m.IdMob,
                Name = m.Name,
                MobType = m.MobType,
                BaseHealth = m.BaseHealth,
                BaseDamage = m.BaseDamage,
                CoinsOnDeath = m.CoinsOnDeath,
                ExpOrbs = m.ExpOrbs,
                SkillXpAmount = m.SkillXpAmount,
                Location = m.Location,
                Icon = m.Icon,
                SkillXpType = m.SkillXpType,
                SkillXpTypeName = m.SkillXpTypeNavigation != null ? m.SkillXpTypeNavigation.Name : null,
                Drops = m.FkMobDropTableidMobDropTables
                    .OrderBy(d => d.IdMobDropTable)
                    .Select(d => new CombatMobDropResponse
                    {
                        IdMobDropTable = d.IdMobDropTable,
                        ItemId = d.FkItemidItem,
                        ItemName = d.FkItemidItemNavigation.Name,
                        ItemCategory = d.FkItemidItemNavigation.Category,
                        ItemIcon = d.FkItemidItemNavigation.Icon,
                        DropChance = d.DropChance,
                        MinQuantity = d.MinQuantity,
                        MaxQuantity = d.MaxQuantity,
                    })
                    .ToList(),
            }).ToList();

            return Ok(mobs);
        }

        public sealed class CombatMobResponse
        {
            public int IdMob { get; set; }
            public string Name { get; set; } = string.Empty;
            public string MobType { get; set; } = string.Empty;
            public int BaseHealth { get; set; }
            public int BaseDamage { get; set; }
            public int CoinsOnDeath { get; set; }
            public int ExpOrbs { get; set; }
            public float? SkillXpAmount { get; set; }
            public string? Location { get; set; }
            public string? Icon { get; set; }
            public int? SkillXpType { get; set; }
            public string? SkillXpTypeName { get; set; }
            public List<CombatMobDropResponse> Drops { get; set; } = new();
        }

        public sealed class CombatMobDropResponse
        {
            public int IdMobDropTable { get; set; }
            public int ItemId { get; set; }
            public string ItemName { get; set; } = string.Empty;
            public string ItemCategory { get; set; } = string.Empty;
            public string? ItemIcon { get; set; }
            public float DropChance { get; set; }
            public int MinQuantity { get; set; }
            public int MaxQuantity { get; set; }
        }
    }
}