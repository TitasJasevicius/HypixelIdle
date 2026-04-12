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
    public class ContractController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public ContractController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetContracts")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Contract>>> GetContracts()
        {
            var contracts = await _context.Contracts
                .Include(contract => contract.FkContractdifficultyidContractdifficultyNavigation)
                .Include(contract => contract.FkSkillsidSkillsNavigation)
                .Include(contract => contract.FkMobidMobNavigation)
                .Include(contract => contract.FkNodeidNodeNavigation)
                .Include(contract => contract.ContractContractrewards)
                .ToListAsync();

            if (contracts == null)
            {
                return NotFound();
            }

            return Ok(contracts);
        }

        [HttpGet]
        [Route("GetContractsWithRewards")]
        [AllowAnonymous]
        public async Task<ActionResult<List<ContractDefinitionResponse>>> GetContractsWithRewards(string? difficulty)
        {
            var query = _context.Contracts
                .AsNoTracking()
                .Include(contract => contract.FkContractdifficultyidContractdifficultyNavigation)
                .Include(contract => contract.FkSkillsidSkillsNavigation)
                .Include(contract => contract.FkMobidMobNavigation)
                .Include(contract => contract.FkNodeidNodeNavigation)
                .Include(contract => contract.ContractContractrewards)
                    .ThenInclude(link => link.FkContractRewardidContractRewardNavigation)
                        .ThenInclude(reward => reward.FkItemidItemNavigation)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(difficulty))
            {
                var normalizedDifficulty = difficulty.Trim();
                query = query.Where(contract => contract.FkContractdifficultyidContractdifficultyNavigation.Value == normalizedDifficulty);
            }

            var contracts = await query
                .OrderBy(contract => contract.FkContractdifficultyidContractdifficultyNavigation.Value)
                .ThenBy(contract => contract.ContractName)
                .Select(contract => new ContractDefinitionResponse
                {
                    ContractId = contract.IdContract,
                    ContractName = contract.ContractName,
                    Difficulty = contract.FkContractdifficultyidContractdifficultyNavigation.Value,
                    TargetCount = contract.TargetCount,
                    SkillId = contract.FkSkillsidSkills,
                    SkillName = contract.FkSkillsidSkillsNavigation.Name,
                    TargetMobId = contract.FkMobidMob,
                    TargetMobName = contract.FkMobidMobNavigation != null ? contract.FkMobidMobNavigation.Name : null,
                    TargetNodeId = contract.FkNodeidNode,
                    TargetNodeName = contract.FkNodeidNodeNavigation != null ? contract.FkNodeidNodeNavigation.FkOutputitemidItemNavigation.Name : null,
                    Rewards = contract.ContractContractrewards
                        .OrderBy(link => link.FkContractRewardidContractReward)
                        .Select(link => new ContractRewardResponse
                        {
                            ContractRewardId = link.FkContractRewardidContractRewardNavigation.IdContractReward,
                            Chance = link.FkContractRewardidContractRewardNavigation.Chance,
                            XpReward = link.FkContractRewardidContractRewardNavigation.XpReward,
                            CoinReward = link.FkContractRewardidContractRewardNavigation.CoinReward,
                            ContractPoints = link.FkContractRewardidContractRewardNavigation.ContractPoints,
                            ItemRewardId = link.FkContractRewardidContractRewardNavigation.FkItemidItem,
                            ItemRewardName = link.FkContractRewardidContractRewardNavigation.FkItemidItemNavigation != null
                                ? link.FkContractRewardidContractRewardNavigation.FkItemidItemNavigation.Name
                                : null,
                        })
                        .ToList(),
                })
                .ToListAsync();

            return Ok(contracts);
        }

        [HttpGet]
        [Route("GetContract")]
        [AllowAnonymous]
        public async Task<ActionResult<Contract>> GetContract(int id)
        {
            var contract = await _context.Contracts.FindAsync(id);

            if (contract == null)
            {
                return NotFound();
            }

            return Ok(contract);
        }

        [HttpPost]
        [Route("AddContract")]
        public async Task<ActionResult<Contract>> AddContract(Contract contract)
        {
            _context.Contracts.Add(contract);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetContracts), new { id = contract.IdContract }, contract);
        }

        [HttpDelete]
        [Route("DeleteContract")]
        public async Task<ActionResult> DeleteContract(int id)
        {
            var contract = await _context.Contracts.FindAsync(id);

            if (contract == null)
            {
                return NotFound();
            }

            _context.Contracts.Remove(contract);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        public sealed class ContractDefinitionResponse
        {
            public int ContractId { get; set; }

            public string ContractName { get; set; } = string.Empty;

            public string Difficulty { get; set; } = string.Empty;

            public int TargetCount { get; set; }

            public int SkillId { get; set; }

            public string? SkillName { get; set; }

            public int? TargetMobId { get; set; }

            public string? TargetMobName { get; set; }

            public int? TargetNodeId { get; set; }

            public string? TargetNodeName { get; set; }

            public List<ContractRewardResponse> Rewards { get; set; } = new();
        }

        public sealed class ContractRewardResponse
        {
            public int ContractRewardId { get; set; }

            public float Chance { get; set; }

            public int? XpReward { get; set; }

            public int? CoinReward { get; set; }

            public int ContractPoints { get; set; }

            public int? ItemRewardId { get; set; }

            public string? ItemRewardName { get; set; }
        }
    }
}