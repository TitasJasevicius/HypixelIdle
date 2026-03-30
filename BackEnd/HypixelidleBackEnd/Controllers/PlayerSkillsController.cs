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
                _context.Playerskills.Add(playerSkill);
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}