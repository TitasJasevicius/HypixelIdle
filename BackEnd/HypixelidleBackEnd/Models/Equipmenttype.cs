using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Equipmenttype
{
    public int IdEquipmentTypes { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Playerequipment> Playerequipments { get; set; } = new List<Playerequipment>();
}
