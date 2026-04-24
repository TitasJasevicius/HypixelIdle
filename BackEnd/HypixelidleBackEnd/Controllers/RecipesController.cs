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
    public class RecipesController : ControllerBase
    {
        private readonly HypixelIdleContext _context;

        public RecipesController(HypixelIdleContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetRecipes")]
        public async Task<ActionResult<List<Recipe>>> GetRecipes()
        {
            var recipes = await _context.Recipes.ToListAsync();

            if (recipes == null)
            {
                return NotFound();
            }

            return Ok(recipes);
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("GetRecipe")]
        public async Task<ActionResult<Recipe>> GetRecipe(int id)
        {
            var recipe = await _context.Recipes.FindAsync(id);

            if (recipe == null)
            {
                return NotFound();
            }

            return Ok(recipe);
        }

        [HttpPost]
        [Route("AddRecipe")]
        public async Task<ActionResult<Recipe>> AddRecipe(Recipe recipe)
        {

            if (!AuthorizationHelper.IsAdmin(User))
            {
                return Unauthorized();
            }

            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRecipes), new { id = recipe.IdRecipes }, recipe);
            
        }

        


    }
}