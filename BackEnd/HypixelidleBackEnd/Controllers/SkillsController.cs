using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SkillsController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public SkillsController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetSkills")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Skill>>> GetSkills()
        {
            var skills = await _context.Skills.ToListAsync();

            if (skills == null)
            {
                return NotFound();
            }

            return Ok(skills);
        }

        [HttpPost]
        [Route("AddSkill")]
        public async Task<ActionResult<Skill>> AddSkill(Skill skill)
        {
            _context.Skills.Add(skill);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSkills), new { id = skill.IdSkills }, skill);
            
        }

        
    }
}