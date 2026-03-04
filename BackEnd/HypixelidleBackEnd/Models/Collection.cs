using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Collection
{
    public string Name { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string Icon { get; set; } = null!;

    public int IdCollection { get; set; }

    public virtual ICollection<Collectiontier> Collectiontiers { get; set; } = new List<Collectiontier>();

    public virtual Item? Item { get; set; }

    public virtual ICollection<Playercollection> Playercollections { get; set; } = new List<Playercollection>();

    public virtual ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();
}
