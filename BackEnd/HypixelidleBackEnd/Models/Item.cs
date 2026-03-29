using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Item
{
    public string Name { get; set; } = null!;

    public string Category { get; set; } = null!;

    public string? Icon { get; set; }

    public bool Stackable { get; set; }

    public int StackValue { get; set; }

    public int? SellValue { get; set; }

    public int Rarity { get; set; }

    public int IdItem { get; set; }

    public int? FkCollectionidCollection { get; set; }

    public virtual Collectiontier? Collectiontier { get; set; }

    public virtual ICollection<Entitystat> Entitystats { get; set; } = new List<Entitystat>();

    public virtual Collection FkCollectionidCollectionNavigation { get; set; } = null!;

    public virtual ICollection<Iteminstance> Iteminstances { get; set; } = new List<Iteminstance>();

    public virtual ICollection<Playerinventoryslot> Playerinventoryslots { get; set; } = new List<Playerinventoryslot>();

    public virtual ICollection<Mobdroptable> Mobdroptables { get; set; } = new List<Mobdroptable>();

    public virtual ICollection<Node> NodeFkNodeitemidItemNavigations { get; set; } = new List<Node>();

    public virtual ICollection<Node> NodeFkOutputitemidItemNavigations { get; set; } = new List<Node>();

    public virtual ICollection<Playersackitem> Playersackitems { get; set; } = new List<Playersackitem>();

    public virtual Rarity RarityNavigation { get; set; } = null!;

    public virtual ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();

    public virtual ICollection<Sacktypealloweditem> Sacktypealloweditems { get; set; } = new List<Sacktypealloweditem>();
}
