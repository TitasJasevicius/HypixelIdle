using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Player
{
    public string Username { get; set; } = null!;

    public string Password { get; set; } = null!;

    public string Email { get; set; } = null!;

    public int SkyblockLevel { get; set; }

    public int CurrentXp { get; set; }

    public float EnchantingLvl { get; set; }

    public int GardenXp { get; set; }

    public int IdPlayer { get; set; }

    public virtual Bank? Bank { get; set; }

    public virtual ICollection<Entitystat> Entitystats { get; set; } = new List<Entitystat>();

    public virtual Playeraccesorybag? Playeraccesorybag { get; set; }

    public virtual Playeractivity? Playeractivity { get; set; }

    public virtual ICollection<Playerbestiary> Playerbestiaries { get; set; } = new List<Playerbestiary>();

    public virtual ICollection<Playercollection> Playercollections { get; set; } = new List<Playercollection>();

    public virtual ICollection<Playerequipment> Playerequipments { get; set; } = new List<Playerequipment>();

    public virtual ICollection<Playergardenplot> Playergardenplots { get; set; } = new List<Playergardenplot>();

    public virtual ICollection<Playerinventoryslot> Playerinventoryslots { get; set; } = new List<Playerinventoryslot>();

    public virtual ICollection<Playersack> Playersacks { get; set; } = new List<Playersack>();

    public virtual ICollection<Playerskill> Playerskills { get; set; } = new List<Playerskill>();

    public virtual ICollection<Playerstoragepage> Playerstoragepages { get; set; } = new List<Playerstoragepage>();

    public virtual ICollection<Playernodeunlock> Playernodeunlocks { get; set; } = new List<Playernodeunlock>();

    public virtual Purse? Purse { get; set; }
}
