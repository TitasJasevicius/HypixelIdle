using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playerequipment
{
    public int Slot { get; set; }

    public int IdPlayerEquipment { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;

    public virtual Iteminstance? Iteminstance { get; set; }

    public virtual Equipmenttype SlotNavigation { get; set; } = null!;
}
