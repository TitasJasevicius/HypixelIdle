using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //do later
    //[Authorize]
    public class MobDropTableController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public MobDropTableController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetMobDropTables")]
        public async Task<ActionResult<List<Mobdroptable>>> GetMobDropTables()
        {
            var mobDropTables = await _context.Mobdroptables.ToListAsync();

            if (mobDropTables == null)
            {
                return NotFound();
            }

            return Ok(mobDropTables);
        }

        [HttpGet]
        [Route("GetMobDropTable")]
        public async Task<ActionResult<Mobdroptable>> GetMobDropTable(int id)
        {
            var mobDropTable = await _context.Mobdroptables.FindAsync(id);

            if (mobDropTable == null)
            {
                return NotFound();
            }

            return Ok(mobDropTable);
        }

        [HttpPost]
        [Route("AddMobDropTable")]
        public async Task<ActionResult<Mobdroptable>> AddMobDropTable(Mobdroptable mobDropTable)
        {
            _context.Mobdroptables.Add(mobDropTable);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMobDropTable), new { id = mobDropTable.IdMobDropTable }, mobDropTable);
        }

        [HttpPut]
        [Route("UpdateMobDropTable")]
        public async Task<ActionResult> UpdateMobDropTable(int mobDropTableId, Mobdroptable updatedMobDropTable)
        {
            var mobDropTable = await _context.Mobdroptables.FindAsync(mobDropTableId);

            if (mobDropTable == null)
            {
                return NotFound();
            }

            mobDropTable = updatedMobDropTable;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete]
        [Route("DeleteMobDropTable")]
        public async Task<ActionResult> DeleteMobDropTable(int id)
        {
            var mobDropTable = await _context.Mobdroptables.FindAsync(id);

            if (mobDropTable == null)
            {
                return NotFound();
            }

            _context.Mobdroptables.Remove(mobDropTable);
            await _context.SaveChangesAsync();

            return NoContent();
        }

    }
}