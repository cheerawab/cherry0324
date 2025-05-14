import { createTicket, closeTicket, deleteTicket, reopenTicket } from '../feature/ticketManager.js';

export async function handleButtonInteraction(interaction) {
    // Return immediately if it's not a button interaction
    if (!interaction.isButton()) return;

    console.log(`Button interaction detected, customId: ${interaction.customId}`);

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
            console.log(`Processing ticket creation for category: ${action}`);
            await createTicket(interaction, action);
            console.log(`Successfully created ticket for category: ${action}`);
            await interaction.followUp({ content: `✅ 客服單已開啟!`, flags: 64 });
        } 
        // Handle ticket closure
        else if (action === 'close') {
            console.log(`Closing ticket`);
            await closeTicket(interaction);
        } 
        // Handle ticket deletion
        else if (action === 'delete') {
            console.log(`Deleting ticket`);
            await deleteTicket(interaction);
        } 
        // Handle ticket reopening
        else if (action === 'reopen') {
            console.log(`Reopening ticket`);
            await reopenTicket(interaction);
        } 
        // Handle invalid ticket operations
        else {
            await interaction.followUp({ content: '⚠️ Invalid ticket operation.', flags: 64 });
        }
    } catch (err) {
        console.error(`❌ Error occurred during ticket operation:`, err);

        // If not yet replied, use followUp to report the error
        if (!interaction.replied) {
            await interaction.followUp({ content: '⚠️ An error occurred during the ticket operation.', flags: 64 });
        }
    }
}