using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Skillxptype
{
    public int IdSkillXpTypes { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Mob> Mobs { get; set; } = new List<Mob>();
}
