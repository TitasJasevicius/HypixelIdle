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

            if (request.CollectionId.HasValue && request.CollectionId.Value > 0)
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

            var created = false;

            if (playerCollection == null)
            {
                created = true;
                playerCollection = new Playercollection
                {
                    FkPlayeridPlayer = request.PlayerId,
                    FkCollectionidCollection = collection.IdCollection,
                    TotalCollected = amountToAdd,
                    Unlocked = true,
                    CurrentTier = 0
                };

                _context.Playercollections.Add(playerCollection);
            }
            else
            {
                playerCollection.TotalCollected += amountToAdd;
                playerCollection.Unlocked = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new CollectionProgressResponse
            {
                PlayerId = playerCollection.FkPlayeridPlayer,
                CollectionId = playerCollection.FkCollectionidCollection,
                CollectionName = collection.Name,
                TotalCollected = playerCollection.TotalCollected,
                CurrentTier = playerCollection.CurrentTier,
                Unlocked = playerCollection.Unlocked,
                AmountAdded = amountToAdd,
                Created = created
            });
        }

        public sealed class CollectionProgressRequest
        {
            public int PlayerId { get; set; }

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
        }

        
    }
}