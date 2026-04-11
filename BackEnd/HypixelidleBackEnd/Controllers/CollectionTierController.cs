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
    public class CollectionTierController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public CollectionTierController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetCollectionTiers")]
        [AllowAnonymous]
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
        [Route("GetCollectionTier")]
        [AllowAnonymous]
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
            _context.Collectiontiers.Add(collectionTier);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCollectionTiers), new { id = collectionTier.IdCollectionTiers }, collectionTier);
        }

        [HttpGet]
        [Route("GetCollectionTierByCollection")]
        [AllowAnonymous]
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
        [Route("GetCollectionTierByItem")]
        [AllowAnonymous]
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
