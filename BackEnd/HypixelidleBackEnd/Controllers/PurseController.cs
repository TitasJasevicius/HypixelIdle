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
    public class PurseController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public PurseController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetPurse")]
        public async Task<ActionResult<Purse>> GetPurse(int playerId)
        {
            var purse = await _context.Purses.FirstOrDefaultAsync(p => p.FkPlayeridPlayer == playerId);

            if (purse == null)
            {
                purse = new Purse
                {
                    IdPurse = await GetNextPurseId(),
                    FkPlayeridPlayer = playerId,
                    Balance = 0,
                    Bits = 0,
                };

                _context.Purses.Add(purse);
                await _context.SaveChangesAsync();
            }

            return Ok(purse);
        }

        [HttpPost]
        [Route("AddPurse")]
        public async Task<ActionResult<Purse>> AddPurse(Purse purse)
        {
            _context.Purses.Add(purse);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPurse), new { id = purse.IdPurse }, purse);
        }

        [HttpPut]
        [Route("UpdatePurse")]
        public async Task<ActionResult> UpdatePurse(int playerId, int amountBalance, int amountBits)
        {
            var purse = await _context.Purses.FirstOrDefaultAsync(p => p.FkPlayeridPlayer == playerId);

            if (purse == null)
            {
                purse = new Purse
                {
                    IdPurse = await GetNextPurseId(),
                    FkPlayeridPlayer = playerId,
                    Balance = 0,
                    Bits = 0,
                };

                _context.Purses.Add(purse);
            }

            purse.Balance += amountBalance;
            purse.Bits += amountBits;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task<int> GetNextPurseId()
        {
            var maxId = await _context.Purses.MaxAsync(p => (int?)p.IdPurse) ?? 0;
            return maxId + 1;
        }

        [HttpPost]
        [Route("InitializePlayerPurse")]
        public async Task<ActionResult> InitializePlayerPurse(int playerId)
        {
            var purse = await _context.Purses.FirstOrDefaultAsync(p => p.FkPlayeridPlayer == playerId);

            if (purse == null)
            {
                purse = new Purse
                {
                    IdPurse = await GetNextPurseId(),
                    FkPlayeridPlayer = playerId,
                    Balance = 0,
                    Bits = 0,
                };

                _context.Purses.Add(purse);
                await _context.SaveChangesAsync();
            }

            return NoContent();
        }

        [HttpDelete]
        [Route("DeletePurse")]
        public async Task<ActionResult> DeletePurse(int playerId)
        {
            var purse = await _context.Purses.FirstOrDefaultAsync(p => p.FkPlayeridPlayer == playerId);
            
            if (purse == null)
            {
                return NotFound();
            }

            _context.Purses.Remove(purse);
            await _context.SaveChangesAsync();

            return NoContent();

        }


        
    }
}