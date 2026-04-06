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

            playerSkill.Xp += request.XpToAdd;

            await _context.SaveChangesAsync();
            return Ok(playerSkill);
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