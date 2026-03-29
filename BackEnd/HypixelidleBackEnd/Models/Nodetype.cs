using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Nodetype
{
    public int IdNodeType { get; set; }

    public string Name { get; set; } = null!;

    public bool IsEnabled { get; set; }

    public virtual ICollection<Node> Nodes { get; set; } = new List<Node>();
}
