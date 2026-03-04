using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Sacktypealloweditem
{
    public int IdSackTypeAllowedItems { get; set; }

    public int FkItemidItem { get; set; }

    public int FkSackTypesidSackTypes { get; set; }

    public virtual Item FkItemidItemNavigation { get; set; } = null!;

    public virtual Sacktype FkSackTypesidSackTypesNavigation { get; set; } = null!;
}
