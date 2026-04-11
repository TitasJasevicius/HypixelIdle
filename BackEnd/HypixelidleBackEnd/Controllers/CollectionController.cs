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
    public class CollectionController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public CollectionController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetCollections")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Collection>>> GetCollections()
        {
            var collections = await _context.Collections.ToListAsync();

            if (collections == null)
            {
                return NotFound();
            }

            return Ok(collections);
        }

        [HttpGet]
        [Route("GetCollection")]
        [AllowAnonymous]
        public async Task<ActionResult<Collection>> GetCollection(string name)
        {
            var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Name == name);

            if (collection == null)
            {
                return NotFound();
            }

            return Ok(collection);
        }

        [HttpPost]
        [Route("AddCollection")]
        public async Task<ActionResult<Collection>> AddCollection(Collection collection)
        {
            _context.Collections.Add(collection);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCollections), new { id = collection.IdCollection }, collection);
            
        }

        [HttpGet]
        [Route("GetCollectionOverview")]
        [AllowAnonymous]
        public async Task<ActionResult<List<CollectionOverviewResponse>>> GetCollectionOverview(int? playerId = null)
        {
            var collections = await _context.Collections
                .AsNoTracking()
                .Include(collection => collection.Collectiontiers)
                    .ThenInclude(collectionTier => collectionTier.FkItemidItemNavigation)
                .ToListAsync();

            if (collections == null)
            {
                return NotFound();
            }

            var playerCollectionLookup = new Dictionary<int, Playercollection>();

            if (playerId.HasValue && playerId.Value > 0)
            {
                playerCollectionLookup = await _context.Playercollections
                    .AsNoTracking()
                    .Where(playerCollection => playerCollection.FkPlayeridPlayer == playerId.Value)
                    .ToDictionaryAsync(playerCollection => playerCollection.FkCollectionidCollection);
            }

            var collectionOverviews = collections
                .OrderBy(collection => collection.Name)
                .Select(collection => BuildCollectionOverview(collection, playerCollectionLookup))
                .ToList();

            return Ok(collectionOverviews);
        }

        private static CollectionOverviewResponse BuildCollectionOverview(
            Collection collection,
            IReadOnlyDictionary<int, Playercollection> playerCollectionLookup)
        {
            var tiers = CollectionTierMath.ResolveTiers(
                collection.Collectiontiers
                    .OrderBy(collectionTier => collectionTier.RequiredItemsValue)
                    .ToList());

            playerCollectionLookup.TryGetValue(collection.IdCollection, out var playerCollection);

            var totalCollected = playerCollection?.TotalCollected ?? 0;
            var unlocked = playerCollection?.Unlocked ?? false;
            var achievedTierCount = tiers.Count(collectionTier => totalCollected >= collectionTier.RequiredItemsValue);
            var currentTier = Math.Clamp(achievedTierCount, 0, tiers.Count);
            var nextTier = currentTier < tiers.Count ? tiers[currentTier] : null;
            var currentTierThreshold = currentTier > 0 ? tiers[currentTier - 1].RequiredItemsValue : 0;
            var nextTierThreshold = nextTier?.RequiredItemsValue ?? currentTierThreshold;
            var progressToNextTier = Math.Max(0, totalCollected - currentTierThreshold);
            var progressRequiredForNextTier = nextTier == null ? 0 : Math.Max(1, nextTierThreshold - currentTierThreshold);
            var progressPercentToNextTier = nextTier == null
                ? 100f
                : Math.Min(100f, (float)progressToNextTier / progressRequiredForNextTier * 100f);

            return new CollectionOverviewResponse
            {
                CollectionId = collection.IdCollection,
                Name = collection.Name,
                Description = collection.Description,
                Icon = collection.Icon,
                DisplayIcon = GetCollectionDisplayIcon(collection),
                Unlocked = unlocked,
                TotalCollected = totalCollected,
                CurrentTier = currentTier,
                CurrentTierName = currentTier > 0 ? tiers[currentTier - 1].Tier.Name : string.Empty,
                CurrentTierRequiredItemsValue = currentTierThreshold,
                NextTierName = nextTier?.Tier.Name ?? string.Empty,
                NextTierRequiredItemsValue = nextTierThreshold,
                NextTierRewardSkyblockXp = nextTier?.Tier.RewardSkyblockXp ?? 0,
                ProgressToNextTier = progressToNextTier,
                ProgressRequiredForNextTier = progressRequiredForNextTier,
                ProgressPercentToNextTier = progressPercentToNextTier,
                IsMaxTier = nextTier == null,
            };
        }

        [HttpGet]
        [Route("GetPlayerItemCollection")]
        public async Task<ActionResult<Playercollection>> GetPlayerItemCollection(int playerId, int itemId)
        {
            var playerCollection = await _context.Playercollections
                .AsNoTracking()
                .FirstOrDefaultAsync(pc => pc.FkPlayeridPlayer == playerId && pc.FkCollectionidCollection == itemId);

            if (playerCollection == null)
            {
                return NotFound();
            }

            return Ok(playerCollection);
            
        }

        private static string GetCollectionDisplayIcon(Collection collection)
        {
            var tierIcon = collection.Collectiontiers
                .OrderBy(collectionTier => collectionTier.RequiredItemsValue)
                .Select(collectionTier => collectionTier.FkItemidItemNavigation?.Icon)
                .FirstOrDefault(icon => !string.IsNullOrWhiteSpace(icon));

            return tierIcon ?? collection.Icon;
        }

        public sealed class CollectionOverviewResponse
        {
            public int CollectionId { get; set; }

            public string Name { get; set; } = string.Empty;

            public string Description { get; set; } = string.Empty;

            public string Icon { get; set; } = string.Empty;

            public string DisplayIcon { get; set; } = string.Empty;

            public bool Unlocked { get; set; }

            public int TotalCollected { get; set; }

            public int CurrentTier { get; set; }

            public string CurrentTierName { get; set; } = string.Empty;

            public int CurrentTierRequiredItemsValue { get; set; }

            public string NextTierName { get; set; } = string.Empty;

            public int NextTierRequiredItemsValue { get; set; }

            public int NextTierRewardSkyblockXp { get; set; }

            public int ProgressToNextTier { get; set; }

            public int ProgressRequiredForNextTier { get; set; }

            public float ProgressPercentToNextTier { get; set; }

            public bool IsMaxTier { get; set; }
        }
    }
}