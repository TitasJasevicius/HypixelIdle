using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HypixelidleBackEnd.Models;

public partial class Playerinventoryslot
{
    public int SlotIndex { get; set; }

    public int Quantity { get; set; }

    public int IdPlayerInventorySlots { get; set; }

    public int FkPlayeridPlayer { get; set; }

    [JsonIgnore]
    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;

    public virtual Iteminstance? Iteminstance { get; set; }
}
