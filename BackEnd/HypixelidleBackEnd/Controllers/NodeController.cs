using HypixelidleBackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //do later
    //[Authorize]
    public class NodeController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public NodeController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetNodes")]
        public async Task<ActionResult<List<Node>>> GetNodes()
        {
            var nodes = await _context.Nodes.ToListAsync();

            if (nodes == null)
            {
                return NotFound();
            }

            return Ok(nodes);
        }

        [HttpGet]
        [Route("GetNode")]
        public async Task<ActionResult<Node>> GetNode(int id)
        {
            var node = await _context.Nodes.FindAsync(id);

            if (node == null)
            {
                return NotFound();
            }

            return Ok(node);
        }

        [HttpPost]
        [Route("AddNode")]
        public async Task<ActionResult<Node>> AddNode(Node node)
        {
            _context.Nodes.Add(node);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetNode), new { id = node.IdNode }, node);
        }

        
    }
}