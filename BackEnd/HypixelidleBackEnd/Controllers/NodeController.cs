using System.Collections.Generic;
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
        public async Task<ActionResult<List<NodeResponse>>> GetNodes(int? playerId = null)
        {
            var nodes = await _context.Nodes.AsNoTracking().ToListAsync();

            var unlockedNodeIdSet = new HashSet<int>();

            if (playerId.HasValue)
            {
                var unlockedNodeIds = await _context.Playernodeunlocks
                    .AsNoTracking()
                    .Where(playerNodeUnlock => playerNodeUnlock.FkPlayeridPlayer == playerId.Value)
                    .Select(playerNodeUnlock => playerNodeUnlock.FkNodeidNode)
                    .ToListAsync();

                unlockedNodeIdSet = unlockedNodeIds.ToHashSet();
            }

            if (nodes == null)
            {
                return NotFound();
            }

            var nodeResponses = nodes.Select(node => new NodeResponse
            {
                IdNode = node.IdNode,
                FkNodetypeidNodeType = node.FkNodetypeidNodeType,
                FkNodeitemidItem = node.FkNodeitemidItem,
                FkOutputitemidItem = node.FkOutputitemidItem,
                RequiredLevel = node.RequiredLevel,
                IsUnlocked = unlockedNodeIdSet.Contains(node.IdNode),
                UnlockPrice = node.UnlockPrice,
                XpReward = node.XpReward,
                BaseYieldQty = node.BaseYieldQty,
                RespawnMs = node.RespawnMs,
                NodeHealth = node.NodeHealth,
                RequiredToolType = node.RequiredToolType,
                Zone = node.Zone,
                IsEnabled = node.IsEnabled,
            }).ToList();

            return Ok(nodeResponses);
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

        [HttpPost]
        [Route("UnlockNode")]
        public async Task<ActionResult> UnlockNode([FromBody] UnlockNodeRequest request)
        {
            if (request.PlayerId <= 0 || request.NodeId <= 0)
            {
                return BadRequest();
            }

            var node = await _context.Nodes.FirstOrDefaultAsync(currentNode => currentNode.IdNode == request.NodeId);
            if (node == null)
            {
                return NotFound("Node not found.");
            }

            var player = await _context.Players.FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == request.PlayerId);
            if (player == null)
            {
                return NotFound("Player not found.");
            }

            var alreadyUnlocked = await _context.Playernodeunlocks.AnyAsync(playerNodeUnlock =>
                playerNodeUnlock.FkPlayeridPlayer == request.PlayerId &&
                playerNodeUnlock.FkNodeidNode == request.NodeId);

            if (alreadyUnlocked)
            {
                return Ok(new UnlockNodeResponse(true, node.UnlockPrice));
            }

            var purse = await _context.Purses.FirstOrDefaultAsync(currentPurse => currentPurse.FkPlayeridPlayer == request.PlayerId);
            if (purse == null)
            {
                return NotFound("Purse not found.");
            }

            if (purse.Balance < node.UnlockPrice)
            {
                return BadRequest("Not enough coins.");
            }

            purse.Balance -= node.UnlockPrice;

            _context.Playernodeunlocks.Add(new Playernodeunlock
            {
                FkPlayeridPlayer = request.PlayerId,
                FkNodeidNode = request.NodeId,
            });

            await _context.SaveChangesAsync();

            return Ok(new UnlockNodeResponse(true, node.UnlockPrice));
        }

        [HttpPost]
        [Route("InitializeDefaultNodesForPlayer")]
        public async Task<ActionResult> InitializeDefaultNodesForPlayer(int playerId)
        {
            var player = await _context.Players.FirstOrDefaultAsync(currentPlayer => currentPlayer.IdPlayer == playerId);
            if (player == null)
            {
                return NotFound("Player not found.");
            }

            var defaultNodes = await _context.Nodes.Where(node => node.IdNode == 1 || node.IdNode == 12).ToListAsync(); 

            foreach (var defaultNode in defaultNodes)
            {
                var alreadyUnlocked = await _context.Playernodeunlocks.AnyAsync(playerNodeUnlock =>
                    playerNodeUnlock.FkPlayeridPlayer == playerId &&
                    playerNodeUnlock.FkNodeidNode == defaultNode.IdNode);

                if (!alreadyUnlocked)
                {
                    _context.Playernodeunlocks.Add(new Playernodeunlock
                    {
                        FkPlayeridPlayer = playerId,
                        FkNodeidNode = defaultNode.IdNode,
                    });
                }
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        public sealed record UnlockNodeRequest(int PlayerId, int NodeId);

        public sealed record UnlockNodeResponse(bool IsUnlocked, int UnlockPrice);

        public sealed record NodeResponse
        {
            public int IdNode { get; set; }
            public int FkNodetypeidNodeType { get; set; }
            public int FkNodeitemidItem { get; set; }
            public int FkOutputitemidItem { get; set; }
            public int RequiredLevel { get; set; }
            public bool IsUnlocked { get; set; }
            public int UnlockPrice { get; set; }
            public int XpReward { get; set; }
            public int BaseYieldQty { get; set; }
            public int RespawnMs { get; set; }
            public int NodeHealth { get; set; }
            public string? RequiredToolType { get; set; }
            public string? Zone { get; set; }
            public bool IsEnabled { get; set; }
        }

        
    }
}