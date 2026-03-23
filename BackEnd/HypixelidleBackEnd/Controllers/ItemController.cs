using HypixelidleBackEnd.Contracts.Auth;
using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HypixelidleBackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ItemController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public ItemController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("GetItems")]
        [AllowAnonymous]
        public async Task<ActionResult<List<Item>>> GetItems()
        {
            var items = await _context.Items.ToListAsync();

            if (items == null)
            {
                return NotFound();
            }

            return Ok(items);
        }


        [HttpGet]
        [Route("GetItem")]
        [AllowAnonymous]
        public async Task<ActionResult<Item>> GetItem(string name)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Name == name);

            if (item == null)
            {
                return NotFound();
            }

            return Ok(item);
        }

        [HttpPost]
        [Route("AddItem")]
        //update to authorized later
        [AllowAnonymous]
        public async Task<ActionResult<Item>> AddItem(Item item)
        {
            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetItems), new { id = item.IdItem }, item);
            
        }

        /*[HttpPut]
        [Route("UpdateItem")]
        //update to authorized later
        [AllowAnonymous]
        public async Task<ActionResult<Item>> UpdateItem(string name, Item updatedItem)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Name == name);

            if (item == null)
            {
                return NotFound();
            }

            item.Name = updatedItem.Name;
            item.Description = updatedItem.Description;

            _context.Items.Update(item);
            await _context.SaveChangesAsync();

            return Ok(item);
        } */

        [HttpDelete]
        [Route("DeleteItem")]
        //update to authorized later
        [AllowAnonymous]
        public async Task<ActionResult<Item>> DeleteItem(string name)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Name == name);

            if (item == null)
            {
                return NotFound();
            }

            _context.Items.Remove(item);
            await _context.SaveChangesAsync();

            return Ok(item);
        }

        
        

    }
}