using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Node
{
    public int IdNode { get; set; }

    public int FkNodetypeidNodeType { get; set; }

    public int FkNodeitemidItem { get; set; }

    public int FkOutputitemidItem { get; set; }

    public int RequiredLevel { get; set; }

    public int UnlockPrice { get; set; }

    public int XpReward { get; set; }

    public int BaseYieldQty { get; set; }

    public int RespawnMs { get; set; }

    public int NodeHealth { get; set; }

    public string? RequiredToolType { get; set; }

    public string? Zone { get; set; }

    public bool IsEnabled { get; set; }

    public virtual ICollection<Playernodeunlock> Playernodeunlocks { get; set; } = new List<Playernodeunlock>();

    public virtual Item FkNodeitemidItemNavigation { get; set; } = null!;

    public virtual Nodetype FkNodetypeidNodeTypeNavigation { get; set; } = null!;

    public virtual Item FkOutputitemidItemNavigation { get; set; } = null!;
}
