using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TaskManager.Backend.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
    }
}
