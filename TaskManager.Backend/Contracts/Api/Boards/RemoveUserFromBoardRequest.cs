namespace TaskManager.Backend.Contracts.Api.Boards
{
    public class RemoveUserFromBoardRequest
    {
        public string BoardID { get; set; } = string.Empty;
        public string UserID { get; set; } = string.Empty;
    }
}
