using TaskManager.Backend.Models.Enums;

namespace TaskManager.Backend.Contracts.Boards
{
    public class AddUserToBoardRequest
    {
        public string BoardID { get; set; } = string.Empty;
        public string UserID { get; set; } = string.Empty;
        public Role Role { get; set; }
    }
}
