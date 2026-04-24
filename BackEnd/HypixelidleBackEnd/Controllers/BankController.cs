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
    public class BankController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public BankController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetBank")]
        public async Task<ActionResult<Bank>> GetBank(int playerId)
        {
            var bank = await _context.Banks.FirstOrDefaultAsync(b => b.FkPlayeridPlayer == playerId);

            if (bank == null)
            {
                bank = new Bank
                {
                    IdBank = await GetNextBankId(),
                    FkPlayeridPlayer = playerId,
                    Balance = 0,
                };

                _context.Banks.Add(bank);
                await _context.SaveChangesAsync();
            }

            return Ok(bank);
        }

        [HttpPost]
        [Route("AddBank")]

        public async Task<ActionResult<Bank>> AddBank(Bank bank)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            _context.Banks.Add(bank);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetBank), new { id = bank.IdBank }, bank);
        }

        [HttpPut]
        [Route("UpdateBank")]
        public async Task<ActionResult> UpdateBank(int playerId, int amountBalance)
        {
            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, playerId))
            {
                return Unauthorized();
            }

            var bank = await _context.Banks.FirstOrDefaultAsync(b => b.FkPlayeridPlayer == playerId);

            if (bank == null)
            {
                bank = new Bank
                {
                    IdBank = await GetNextBankId(),
                    FkPlayeridPlayer = playerId,
                    Balance = 0,
                };

                _context.Banks.Add(bank);
            }

            bank.Balance += amountBalance;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task<int> GetNextBankId()
        {
            var maxId = await _context.Banks.MaxAsync(b => (int?)b.IdBank) ?? 0;
            return maxId + 1;
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("InitializePlayerBank")]
        public async Task<ActionResult> InitializePlayerBank(int playerId)
        {
            var bank = await _context.Banks.FirstOrDefaultAsync(b => b.FkPlayeridPlayer == playerId);

            if (bank == null)
            {
                bank = new Bank
                {
                    IdBank = await GetNextBankId(),
                    FkPlayeridPlayer = playerId,
                    Balance = 0,
                };

                _context.Banks.Add(bank);
                await _context.SaveChangesAsync();
            }

            return NoContent();
        }

        [HttpDelete]
        [Route("DeleteBank")]
        public async Task<ActionResult> DeleteBank(int playerId)
        {
            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, playerId))
            {
                return Unauthorized();
            }

            var bank = await _context.Banks.FirstOrDefaultAsync(b => b.FkPlayeridPlayer == playerId);

            if (bank == null)
            {
                return NotFound();
            }

            _context.Banks.Remove(bank);
            await _context.SaveChangesAsync();

            return NoContent();
        }

    }
}