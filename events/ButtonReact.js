import { createTicket, closeTicket, deleteTicket, reopenTicket } from '../feature/ticketManager.js';

export async function handleButtonInteraction(interaction) {
    // Return immediately if it's not a button interaction
    if (!interaction.isButton()) return;

    console.log(`偵測到按鈕互動，customId: ${interaction.customId}`);

    // Ensure the response is deferred only once to avoid InteractionAlreadyReplied error
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
    }

    const { customId } = interaction;

    // Return if customId does not start with 'ticket_'
    if (!customId.startsWith('ticket_')) return;

    const action = customId.replace('ticket_', '');

    try {
        // Handle ticket creation for different categories
        if (['report', 'coop', 'apply', 'rewards', 'others'].includes(action)) {
            console.log(`正在處理客服單類別: ${action}`);
            await createTicket(interaction, action);
            console.log(`已成功建立客服單，類別: ${action}`);
            await interaction.followUp({ content: `✅ 客服單已開啟!`, flags: 64 });
        } 
        // Handle ticket closure
        else if (action === 'close') {
            console.log(`正在關閉客服單`);
            await closeTicket(interaction);
        } 
        // Handle ticket deletion
        else if (action === 'delete') {
            console.log(`正在刪除客服單`);
            await deleteTicket(interaction);
        } 
        // Handle ticket reopening
        else if (action === 'reopen') {
            console.log(`正在重新開啟客服單`);
            await reopenTicket(interaction);
        } 
        // Handle invalid ticket operations
        else {
            await interaction.followUp({ content: '⚠️ 無效的客服單操作。', flags: 64 });
        }
    } catch (err) {
        console.error(`❌ 客服單操作時發生錯誤:`, err);

        // If not yet replied, use followUp to report the error
        if (!interaction.replied) {
            await interaction.followUp({ content: '⚠️ 客服單操作時發生錯誤。', flags: 64 });
        }
    }
}