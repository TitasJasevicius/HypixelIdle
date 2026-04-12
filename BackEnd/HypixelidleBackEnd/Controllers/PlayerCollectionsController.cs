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
    public class PlayerCollectionsController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public PlayerCollectionsController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetPlayerCollections")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Playercollection>>> GetPlayerCollections()
        {
            var playerCollections = await _context.Playercollections.ToListAsync();

            if (playerCollections == null)
            {
                return NotFound();
            }

            return Ok(playerCollections);
        }

        [HttpGet]
        [Route("GetPlayerCollection")]
        [AllowAnonymous]
        public async Task<ActionResult<Playercollection>> GetPlayerCollection(int playerId, int collectionId)
        {
            var playerCollection = await _context.Playercollections
                .FirstOrDefaultAsync(pc =>
                    pc.FkPlayeridPlayer == playerId
                    && pc.FkCollectionidCollection == collectionId);

            if (playerCollection == null)
            {
                return NotFound();
            }

            return Ok(playerCollection);
        }

        [HttpPost]
        [Route("AddPlayerCollection")]
        public async Task<ActionResult<Playercollection>> AddPlayerCollection(Playercollection playerCollection)
        {
            _context.Playercollections.Add(playerCollection);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPlayerCollections), new { id = playerCollection.IdPlayerCollections }, playerCollection);
            
        }

        [HttpPost]
        [Route("AddOrUpdateCollectionProgress")]
        [AllowAnonymous]
        public async Task<ActionResult<CollectionProgressResponse>> AddOrUpdateCollectionProgress([FromBody] CollectionProgressRequest request)
        {
            if (request.PlayerId <= 0)
            {
                return BadRequest("PlayerId is required.");
            }

            var amountToAdd = Math.Max(1, request.AmountToAdd);

            Collection? collection = null;

            if (request.ItemId.HasValue && request.ItemId.Value > 0)
            {
                var itemId = request.ItemId.Value;

                var collectionIdFromTier = await _context.Collectiontiers
                    .AsNoTracking()
                    .Where(collectionTier => collectionTier.FkItemidItem == itemId)
                    .Select(collectionTier => (int?)collectionTier.FkCollectionidCollection)
                    .FirstOrDefaultAsync();

                if (collectionIdFromTier.HasValue)
                {
                    collection = await _context.Collections
                        .FirstOrDefaultAsync(currentCollection => currentCollection.IdCollection == collectionIdFromTier.Value);
                }

                if (collection == null)
                {
                    var collectionIdFromItem = await _context.Items
                        .AsNoTracking()
                        .Where(item => item.IdItem == itemId)
                        .Select(item => item.FkCollectionidCollection)
                        .FirstOrDefaultAsync();

                    if (collectionIdFromItem.HasValue)
                    {
                        collection = await _context.Collections
                            .FirstOrDefaultAsync(currentCollection => currentCollection.IdCollection == collectionIdFromItem.Value);
                    }
                }
            }

            if (collection == null && request.CollectionId.HasValue && request.CollectionId.Value > 0)
            {
                collection = await _context.Collections
                    .FirstOrDefaultAsync(c => c.IdCollection == request.CollectionId.Value);
            }

            if (collection == null && !string.IsNullOrWhiteSpace(request.CollectionName))
            {
                collection = await _context.Collections
                    .FirstOrDefaultAsync(c => c.Name == request.CollectionName.Trim());
            }

            if (collection == null)
            {
                return BadRequest("CollectionId or valid CollectionName is required.");
            }

            var playerCollection = await _context.Playercollections
                .FirstOrDefaultAsync(pc =>
                    pc.FkPlayeridPlayer == request.PlayerId
                    && pc.FkCollectionidCollection == collection.IdCollection);

            var player = await _context.Players
                .FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == request.PlayerId);

            if (player == null)
            {
                return NotFound("Player not found.");
            }

            var collectionTiers = await _context.Collectiontiers
                .AsNoTracking()
                .Where(collectionTier => collectionTier.FkCollectionidCollection == collection.IdCollection)
                .OrderBy(collectionTier => collectionTier.RequiredItemsValue)
                .ToListAsync();

            var resolvedTiers = CollectionTierMath.ResolveTiers(collectionTiers);

            var created = false;
            var skyblockXpAwarded = 0;
            var previousTotalCollected = 0;

            if (playerCollection == null)
            {
                created = true;
                playerCollection = new Playercollection
                {
                    FkPlayeridPlayer = request.PlayerId,
                    FkCollectionidCollection = collection.IdCollection,
                    TotalCollected = 0,
                    Unlocked = true,
                    CurrentTier = 0
                };

                _context.Playercollections.Add(playerCollection);
            }
            else
            {
                previousTotalCollected = Math.Max(0, playerCollection.TotalCollected);
                playerCollection.Unlocked = true;
            }

            playerCollection.TotalCollected = previousTotalCollected + amountToAdd;

            var previousTier = resolvedTiers.Count(collectionTier => previousTotalCollected >= collectionTier.RequiredItemsValue);
            var currentTier = resolvedTiers.Count(collectionTier => playerCollection.TotalCollected >= collectionTier.RequiredItemsValue);

            if (currentTier > previousTier)
            {
                var tiersEarned = resolvedTiers
                    .Skip(previousTier)
                    .Take(currentTier - previousTier)
                    .ToList();

                skyblockXpAwarded = tiersEarned.Sum(collectionTier => collectionTier.Tier.RewardSkyblockXp);
                player.CurrentXp += skyblockXpAwarded;
            }

            await _context.SaveChangesAsync();

            return Ok(new CollectionProgressResponse
            {
                PlayerId = playerCollection.FkPlayeridPlayer,
                CollectionId = playerCollection.FkCollectionidCollection,
                CollectionName = collection.Name,
                TotalCollected = playerCollection.TotalCollected,
                CurrentTier = currentTier,
                Unlocked = playerCollection.Unlocked,
                AmountAdded = amountToAdd,
                Created = created,
                SkyblockXpAwarded = skyblockXpAwarded,
                PlayerCurrentXp = player.CurrentXp,
            });
        }

        public sealed class CollectionProgressRequest
        {
            public int PlayerId { get; set; }

            public int? ItemId { get; set; }

            public int? CollectionId { get; set; }

            public string CollectionName { get; set; } = string.Empty;

            public int AmountToAdd { get; set; } = 1;
        }

        public sealed class CollectionProgressResponse
        {
            public int PlayerId { get; set; }

            public int CollectionId { get; set; }

            public string CollectionName { get; set; } = string.Empty;

            public int TotalCollected { get; set; }

            public int CurrentTier { get; set; }

            public bool Unlocked { get; set; }

            public int AmountAdded { get; set; }

            public bool Created { get; set; }

            public int SkyblockXpAwarded { get; set; }

            public int PlayerCurrentXp { get; set; }
        }

        
    }
}