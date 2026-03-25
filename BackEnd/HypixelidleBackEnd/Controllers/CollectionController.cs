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
    }
}