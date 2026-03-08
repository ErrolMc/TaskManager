using TaskManager.Backend.Models.Enums;

namespace TaskManager.Backend.Contracts.Api.Boards
{
    public class ChangeBoardMemberRoleRequest
    {
        public string BoardID { get; set; } = string.Empty;
        public string UserID { get; set; } = string.Empty;
        public Role NewRole { get; set; }
    }
}
