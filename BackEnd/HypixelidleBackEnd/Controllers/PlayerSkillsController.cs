using HypixelidleBackEnd.Contracts.Auth;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //do later
    //[Authorize]
    public class PlayerSkillsController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        private static readonly int[] EarlyLevelXpCurve =
        {
            0, 50, 125, 200, 300,
            500, 750, 1000, 1500, 2000,
            3500,
        };

        public PlayerSkillsController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetPlayerSkills")]
        public async Task<ActionResult<List<Playerskill>>> GetPlayerSkills(int playerId)
        {
            var playerSkills = await _context.Playerskills.Where(ps => ps.FkPlayeridPlayer == playerId).ToListAsync();

            if (playerSkills == null || playerSkills.Count == 0)
            {
                return NotFound();
            }

            return Ok(playerSkills);
        }

        [HttpGet]
        [Route("GetPlayerSkill")]
        public async Task<ActionResult<Playerskill>> GetPlayerSkill(int playerId, int skillId)
        {
            var playerSkill = await _context.Playerskills
                .FirstOrDefaultAsync(ps => ps.FkPlayeridPlayer == playerId && ps.FkSkillsidSkills == skillId);

            if (playerSkill == null)
            {
                return NotFound();
            }

            return Ok(playerSkill);
        }

        

        [HttpPut]
        [Route("AddOrUpdatePlayerSkill")]
        public async Task<ActionResult> AddOrUpdatePlayerSkill(Playerskill playerSkill)
        {
            var existingPlayerSkill = await _context.Playerskills
                .FirstOrDefaultAsync(ps => ps.FkPlayeridPlayer == playerSkill.FkPlayeridPlayer && ps.FkSkillsidSkills == playerSkill.FkSkillsidSkills);

            if (existingPlayerSkill != null)
            {
                existingPlayerSkill.Level = playerSkill.Level;
                existingPlayerSkill.Xp = playerSkill.Xp;
                _context.Playerskills.Update(existingPlayerSkill);
            }
            else
            {
                if (playerSkill.IdPlayerSkills <= 0)
                {
                    playerSkill.IdPlayerSkills = await GetNextPlayerSkillIdAsync();
                }
                _context.Playerskills.Add(playerSkill);
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost]
        [Route("GrantSkillXp")]
        public async Task<ActionResult<Playerskill>> GrantSkillXp([FromBody] GrantSkillXpRequest request)
        {
            if (request.PlayerId <= 0 || request.SkillId <= 0)
            {
                return BadRequest("PlayerId and SkillId must be greater than zero.");
            }

            if (request.XpToAdd <= 0)
            {
                return BadRequest("XpToAdd must be greater than zero.");
            }

            var skillDefinition = await _context.Skills
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IdSkills == request.SkillId);

            if (skillDefinition == null)
            {
                return NotFound("Skill does not exist.");
            }

            var playerSkill = await _context.Playerskills
                .FirstOrDefaultAsync(ps => ps.FkPlayeridPlayer == request.PlayerId && ps.FkSkillsidSkills == request.SkillId);

            if (playerSkill == null)
            {
                playerSkill = new Playerskill
                {
                    IdPlayerSkills = await GetNextPlayerSkillIdAsync(),
                    FkPlayeridPlayer = request.PlayerId,
                    FkSkillsidSkills = request.SkillId,
                    Level = 1,
                    Xp = 0,
                };

                _context.Playerskills.Add(playerSkill);
            }

            var maxLevel = Math.Max(1, skillDefinition.MaxLevel);
            playerSkill.Level = Math.Max(1, playerSkill.Level);
            playerSkill.Xp = Math.Max(0, playerSkill.Xp) + request.XpToAdd;

            while (playerSkill.Level < maxLevel)
            {
                var xpRequired = GetXpToNextLevel(playerSkill.Level);
                if (xpRequired <= 0 || playerSkill.Xp < xpRequired)
                {
                    break;
                }

                playerSkill.Xp -= xpRequired;
                playerSkill.Level += 1;
            }

            if (playerSkill.Level >= maxLevel)
            {
                playerSkill.Level = maxLevel;
                playerSkill.Xp = 0;
            }

            await _context.SaveChangesAsync();
            return Ok(playerSkill);
        }

        private static int GetXpToNextLevel(int level)
        {
            var normalizedLevel = Math.Max(0, level);

            if (normalizedLevel <= 10)
            {
                return EarlyLevelXpCurve[normalizedLevel];
            }

            if (normalizedLevel <= 20)
            {
                return (int)(5000 * Math.Pow(1.35, normalizedLevel - 11));
            }

            if (normalizedLevel <= 44)
            {
                return 100000 * normalizedLevel - 1800000;
            }

            return (int)(2750000 + 300000 * (normalizedLevel - 45));
        }

        private async Task<int> GetNextPlayerSkillIdAsync()
        {
            var currentMax = await _context.Playerskills.MaxAsync(ps => (int?)ps.IdPlayerSkills) ?? 0;
            return currentMax + 1;
        }

        public sealed class GrantSkillXpRequest
        {
            public int PlayerId { get; set; }

            public int SkillId { get; set; }

            public float XpToAdd { get; set; }
        }
    }
}