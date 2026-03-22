namespace TaskManager.Backend.Contracts.Api.CardMessages
{
    public class DeleteCardMessageRequest
    {
        public string BoardID { get; set; } = string.Empty;
        public string CardMessageID { get; set; } = string.Empty;
    }
}

