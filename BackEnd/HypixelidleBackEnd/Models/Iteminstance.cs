using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Iteminstance
{
    public bool RarityOverride { get; set; }

    public string? Reforge { get; set; }

    public int? DungeonStars { get; set; }

    public string? EnchantmentsJson { get; set; }

    public string? CustomName { get; set; }

    public string UniqueId { get; set; } = null!;

    public int? BreakingPower { get; set; }

    public int IdItemInstance { get; set; }

    public int? FkPlayerEquipmentidPlayerEquipment { get; set; }

    public int? FkAccessoryBagSlotsidAccessoryBagSlots { get; set; }

    public int FkItemidItem { get; set; }

    public int? FkPlayerStorageSlotsidPlayerStorageSlots { get; set; }

    public int? FkPlayerInventorySlotsidPlayerInventorySlots { get; set; }

    public virtual Accessorybagslot? FkAccessoryBagSlotsidAccessoryBagSlotsNavigation { get; set; }

    public virtual Item? FkItemidItemNavigation { get; set; } = null!;

    public virtual Playerequipment? FkPlayerEquipmentidPlayerEquipmentNavigation { get; set; }

    public virtual Playerinventoryslot? FkPlayerInventorySlotsidPlayerInventorySlotsNavigation { get; set; }

    public virtual Playerstorageslot? FkPlayerStorageSlotsidPlayerStorageSlotsNavigation { get; set; }
}
