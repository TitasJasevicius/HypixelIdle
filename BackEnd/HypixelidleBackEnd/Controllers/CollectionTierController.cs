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
    public class CollectionTierController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public CollectionTierController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetCollectionTiers")]      
        public async Task<ActionResult<List<Collectiontier>>> GetCollectionTiers()
        {
            var collectionTiers = await _context.Collectiontiers.ToListAsync();

            if (collectionTiers == null)
            {
                return NotFound();
            }

            return Ok(collectionTiers);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetCollectionTier")]
        public async Task<ActionResult<Collectiontier>> GetCollectionTier(int id)
        {
            var collectionTier = await _context.Collectiontiers.FindAsync(id);

            if (collectionTier == null)
            {
                return NotFound();
            }

            return Ok(collectionTier);
        }

        [HttpPost]
        [Route("AddCollectionTier")]
        public async Task<ActionResult<Collectiontier>> AddCollectionTier(Collectiontier collectionTier)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            _context.Collectiontiers.Add(collectionTier);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCollectionTiers), new { id = collectionTier.IdCollectionTiers }, collectionTier);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetCollectionTierByCollection")]
        public async Task<ActionResult<List<Collectiontier>>> GetCollectionTierByCollection(int collectionId)
        {
            var collectionTiers = await _context.Collectiontiers
                .Where(ct => ct.FkCollectionidCollection == collectionId)
                .ToListAsync();

            if (collectionTiers == null || collectionTiers.Count == 0)
            {
                return NotFound();
            }

            return Ok(collectionTiers);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetCollectionTierByItem")]
        public async Task<ActionResult<List<Collectiontier>>> GetCollectionTierByItem(int itemId)
        {
            var collectionTiers = await _context.Collectiontiers
                .Where(ct => ct.FkItemidItem == itemId)
                .ToListAsync();

            if (collectionTiers == null || collectionTiers.Count == 0)
            {
                return NotFound();
            }

            return Ok(collectionTiers);
        }

        [HttpPut]
        [Route("UpdateCollectionTier")]
        public async Task<ActionResult> UpdateCollectionTier(int id, Collectiontier updatedCollectionTier)
        {
            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            var collectionTier = await _context.Collectiontiers.FindAsync(id);

            if (collectionTier == null)
            {
                return NotFound();
            }

            collectionTier = updatedCollectionTier;

            _context.Collectiontiers.Update(collectionTier);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
