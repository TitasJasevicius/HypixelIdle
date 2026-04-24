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
    public class PlayerController : ControllerBase
    {
        private readonly HypixelIdleContext _context;
        private readonly HashingService _hashingService;
        private readonly PlayerInitialization _playerInitialization;


        public PlayerController(HypixelIdleContext context, HashingService hashingService, PlayerInitialization playerInitialization)
        {
            _context = context;
            _hashingService = hashingService;
            _playerInitialization = playerInitialization;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetPlayer")]
        public async Task<ActionResult<PlayerResponse>> GetPlayer(string username, string password)
        {
            var hashedPassword = _hashingService.HashPassword(password);

            var player = await _context.Players.FirstOrDefaultAsync(p => p.Username == username && p.Password == hashedPassword);

            if (player == null)
            {
                return NotFound();
            }

        
            return Ok(ToResponse(player));
        }

        [HttpPost]
        [AllowAnonymous]
        [Route("CreatePlayer")]
        public async Task<ActionResult<PlayerResponse>> CreatePlayer(Player player)
        {
            string password = _hashingService.HashPassword(player.Password);
            player.Password = password;

            _context.Players.Add(player);
            await _context.SaveChangesAsync();

            if (player.IdPlayer == 0)
            {
                return BadRequest("Player ID not generated");
            }

            var initResult = await _playerInitialization.InitializeNewPlayerAsync(player.IdPlayer);
            if (!initResult.Success)
            {
                return initResult.ErrorResult ?? StatusCode(500, "Player created, but initialization failed.");
            }

            return CreatedAtAction(nameof(GetPlayer), new { username = player.Username }, ToResponse(player));
        }

        [HttpDelete]
        [Route("DeletePlayer")]
        public async Task<ActionResult> DeletePlayer(int playerId)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, playerId))
            {
                return Unauthorized();
            }

            var player = await _context.Players.FindAsync(playerId);

            if (player == null)
            {
                return NotFound();
            }

            _context.Players.Remove(player);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut]
        [Route("UpdatePlayer")]
        public async Task<ActionResult> UpdatePlayer(int playerId, Player updatedPlayer)
        {

            if (!AuthorizationHelper.IsAuthorizedForPlayer(User, playerId))
            {
                return Unauthorized();
            }

            if (playerId != updatedPlayer.IdPlayer)
            {
                return BadRequest();
            }

            var player = await _context.Players.FindAsync(playerId);

            if (player == null)
            {
                return NotFound();
            }

            player.Username = updatedPlayer.Username;
            player.Email = updatedPlayer.Email;
            player.SkyblockLevel = updatedPlayer.SkyblockLevel;
            player.CurrentXp = updatedPlayer.CurrentXp;
            player.EnchantingLvl = updatedPlayer.EnchantingLvl;
            player.GardenXp = updatedPlayer.GardenXp;

            _context.Entry(player).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
               throw;
            }

            return NoContent();
        }

        private static PlayerResponse ToResponse(Player player)
        {
            return new PlayerResponse
            {
                IdPlayer = player.IdPlayer,
                Username = player.Username,
                Email = player.Email,
                SkyblockLevel = player.SkyblockLevel,
                CurrentXp = player.CurrentXp,
                EnchantingLvl = player.EnchantingLvl,
                GardenXp = player.GardenXp,
            };
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetLeaderboard")]
        public async Task<ActionResult<List<LeaderboardEntryResponse>>> GetLeaderboard(string sortBy = "level", int take = 50, int? itemId = null, int? skillId = null)
        {
            var normalizedSortBy = (sortBy ?? "level").Trim().ToLowerInvariant();
            var safeTake = Math.Clamp(take, 1, 200);
            int? selectedCollectionId = null;

            if (itemId.HasValue && itemId.Value > 0)
            {
                selectedCollectionId = await _context.Items
                    .AsNoTracking()
                    .Where(item => item.IdItem == itemId.Value)
                    .Select(item => item.FkCollectionidCollection)
                    .FirstOrDefaultAsync();
            }

            var players = await _context.Players
                .AsNoTracking()
                .Select(player => new
                {
                    player.IdPlayer,
                    player.Username,
                    player.SkyblockLevel,
                    player.CurrentXp,
                })
                .ToListAsync();

            var playerIds = players.Select(player => player.IdPlayer).ToList();

            var purseByPlayerId = await _context.Purses
                .AsNoTracking()
                .Where(purse => playerIds.Contains(purse.FkPlayeridPlayer))
                .GroupBy(purse => purse.FkPlayeridPlayer)
                .Select(group => new
                {
                    PlayerId = group.Key,
                    Balance = group.Sum(purse => purse.Balance),
                })
                .ToDictionaryAsync(row => row.PlayerId, row => row.Balance);

            Dictionary<int, int> skillLevelByPlayerId;

            if (skillId.HasValue && skillId.Value > 0)
            {
                skillLevelByPlayerId = await _context.Playerskills
                    .AsNoTracking()
                    .Where(playerSkill =>
                        playerIds.Contains(playerSkill.FkPlayeridPlayer)
                        && playerSkill.FkSkillsidSkills == skillId.Value)
                    .Select(playerSkill => new
                    {
                        PlayerId = playerSkill.FkPlayeridPlayer,
                        SkillLevel = playerSkill.Level,
                    })
                    .ToDictionaryAsync(row => row.PlayerId, row => row.SkillLevel);
            }
            else
            {
                skillLevelByPlayerId = await _context.Playerskills
                    .AsNoTracking()
                    .Where(playerSkill => playerIds.Contains(playerSkill.FkPlayeridPlayer))
                    .GroupBy(playerSkill => playerSkill.FkPlayeridPlayer)
                    .Select(group => new
                    {
                        PlayerId = group.Key,
                        SkillLevel = group.Sum(playerSkill => playerSkill.Level),
                    })
                    .ToDictionaryAsync(row => row.PlayerId, row => row.SkillLevel);
            }

            Dictionary<int, int> totalCollectedByPlayerId;

            if (selectedCollectionId.HasValue && selectedCollectionId.Value > 0)
            {
                totalCollectedByPlayerId = await _context.Playercollections
                    .AsNoTracking()
                    .Where(playerCollection =>
                        playerIds.Contains(playerCollection.FkPlayeridPlayer) &&
                        playerCollection.FkCollectionidCollection == selectedCollectionId.Value)
                    .Select(playerCollection => new
                    {
                        PlayerId = playerCollection.FkPlayeridPlayer,
                        TotalCollected = playerCollection.TotalCollected,
                    })
                    .ToDictionaryAsync(row => row.PlayerId, row => row.TotalCollected);
            }
            else if (itemId.HasValue && itemId.Value > 0)
            {
                totalCollectedByPlayerId = new Dictionary<int, int>();
            }
            else
            {
                totalCollectedByPlayerId = await _context.Playercollections
                    .AsNoTracking()
                    .Where(playerCollection => playerIds.Contains(playerCollection.FkPlayeridPlayer))
                    .GroupBy(playerCollection => playerCollection.FkPlayeridPlayer)
                    .Select(group => new
                    {
                        PlayerId = group.Key,
                        TotalCollected = group.Sum(playerCollection => playerCollection.TotalCollected),
                    })
                    .ToDictionaryAsync(row => row.PlayerId, row => row.TotalCollected);
            }

            var entries = players
                .Select(player => new LeaderboardEntryResponse
                {
                    PlayerId = player.IdPlayer,
                    Username = player.Username,
                    SkyblockLevel = player.SkyblockLevel,
                    PurseBalance = purseByPlayerId.TryGetValue(player.IdPlayer, out var purseBalance) ? purseBalance : 0,
                    TotalCollected = totalCollectedByPlayerId.TryGetValue(player.IdPlayer, out var totalCollected) ? totalCollected : 0,
                    SkillLevel = skillLevelByPlayerId.TryGetValue(player.IdPlayer, out var skillLevel) ? skillLevel : 0,
                });

            IEnumerable<LeaderboardEntryResponse> orderedEntries = normalizedSortBy switch
            {
                "collections" => entries
                    .OrderByDescending(entry => entry.TotalCollected)
                    .ThenByDescending(entry => entry.SkyblockLevel)
                    .ThenBy(entry => entry.Username),
                "skills" => entries
                    .OrderByDescending(entry => entry.SkillLevel)
                    .ThenByDescending(entry => entry.SkyblockLevel)
                    .ThenBy(entry => entry.Username),
                "coins" => entries
                    .OrderByDescending(entry => entry.PurseBalance)
                    .ThenByDescending(entry => entry.SkyblockLevel)
                    .ThenBy(entry => entry.Username),
                _ => entries
                    .OrderByDescending(entry => entry.SkyblockLevel)
                    .ThenBy(entry => entry.Username),
            };

            var rankedEntries = orderedEntries
                .Take(safeTake)
                .Select((entry, index) =>
                {
                    entry.Rank = index + 1;
                    return entry;
                })
                .ToList();

            return Ok(rankedEntries);
        }

        public sealed class LeaderboardEntryResponse
        {
            public int Rank { get; set; }

            public int PlayerId { get; set; }

            public string Username { get; set; } = string.Empty;

            public int SkyblockLevel { get; set; }

            public float PurseBalance { get; set; }

            public int TotalCollected { get; set; }

            public int SkillLevel { get; set; }
        }

        public sealed class PlayerResponse
        {
            public int IdPlayer { get; set; }

            public string Username { get; set; } = string.Empty;

            public string Email { get; set; } = string.Empty;

            public int SkyblockLevel { get; set; }

            public int CurrentXp { get; set; }

            public float EnchantingLvl { get; set; }

            public int GardenXp { get; set; }
        }





        
    }

}
