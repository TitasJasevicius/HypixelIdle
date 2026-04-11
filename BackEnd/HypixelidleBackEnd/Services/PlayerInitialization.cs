using Microsoft.AspNetCore.Mvc;
using HypixelidleBackEnd.Controllers;

namespace HypixelidleBackEnd.Services;

public sealed class PlayerInitialization
{
	private readonly InventoryController _inventoryController;
    private readonly StatsController _statsController;
    private readonly PlayerSkillsController _playerSkillsController;
    private readonly PurseController _purseController;
    private readonly BankController _bankController;
    private readonly NodeController _nodeController;

	public PlayerInitialization(InventoryController inventoryController, StatsController statsController, 
                                PlayerSkillsController playerSkillsController, PurseController purseController, BankController bankController,
                                NodeController nodeController)
	{
		_inventoryController = inventoryController;
		_statsController = statsController;
		_playerSkillsController = playerSkillsController;
		_purseController = purseController;
		_bankController = bankController;
		_nodeController = nodeController;

	}

	public async Task<(bool Success, ActionResult? ErrorResult)> InitializeNewPlayerAsync(int playerId)
	{
		//Initialize inventory
		var initialInventoryResult = await _inventoryController.CreateInitialInventory(playerId);
		if (!IsSuccessful(initialInventoryResult))
		{
			return (false, initialInventoryResult);
		}

        //Initialize health and other stats if needed(for now its just health tho)
        var defaultPlayerHealth = 100; 

        var initializeHealthResult = await _statsController.InitializePlayerHealth(playerId, defaultPlayerHealth);
        if (!IsSuccessful(initializeHealthResult))
        {
            return (false, initializeHealthResult);
        }

        //Initialize player skills
        var initializeSkillsResult = await _playerSkillsController.InitializePlayerSkills(playerId);
        if (!IsSuccessful(initializeSkillsResult))
        {
            return (false, initializeSkillsResult);
        }
        
        //Initialize purse
        var initializePurseResult = await _purseController.InitializePlayerPurse(playerId);
        if (!IsSuccessful(initializePurseResult))
        {
            return (false, initializePurseResult);
        }

        //Initialize bank
        var initializeBankResult = await _bankController.InitializePlayerBank(playerId);
        if (!IsSuccessful(initializeBankResult))
        {
            return (false, initializeBankResult);
        }

        //Initialize nodes
        var initializeNodesResult = await _nodeController.InitializeDefaultNodesForPlayer(playerId);
        if (!IsSuccessful(initializeNodesResult))
        {
            return (false, initializeNodesResult);
        }

		return (true, null);
	}

	private static bool IsSuccessful(ActionResult result)
	{
		return result switch
		{
			ObjectResult objectResult when objectResult.StatusCode is >= 200 and < 300 => true,
			StatusCodeResult statusCodeResult when statusCodeResult.StatusCode is >= 200 and < 300 => true,
			EmptyResult => true,
			_ => false,
		};
	}
}
