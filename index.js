import https from 'https';
import { parse } from 'url';

const positiveReactions = ["👍", "❤", "🔥", "🥰", "👏", "😁", "🎉", "🤩", "🙏", "👌", "🕊", "😍", "🐳", "❤‍🔥", "🌭", "💯", "🤣", "⚡", "🍌", "🏆", "😘", "🍓", "🍾", "💋", "😇", "🤝", "✍", "🤗", "🫡", "🎅", "🎄", "☃", "🆒", "💘", "🦄", "😎"];
const negativeReactions = ["👎", "🤔", "🤯", "😱", "🤬", "😢", "🤮", "💩", "🤡", "🥱", "🥴", "💔", "🤨", "😐", "🖕", "😈", "😴", "😭", "😨", "🙈", "🙉", "🙊", "😡", "🗿"];
const allReactions = ["👍", "👎", "❤", "🔥", "🥰", "👏", "😁", "🤔", "🤯", "😱", "🤬", "😢", "🎉", "🤩", "🤮", "💩", "🙏", "👌", "🕊", "🤡", "🥱", "🥴", "😍", "🐳", "❤‍🔥", "🌚", "🌭", "💯", "🤣", "⚡", "🍌", "🏆", "💔", "🤨", "😐", "🍓", "🍾", "💋", "🖕", "😈", "😴", "😭", "🤓", "👻", "👨‍💻", "👀", "🎃", "🙈", "😇", "😨", "🤝", "✍", "🤗", "🫡", "🎅", "🎄", "☃", "💅", "🤪", "🗿", "🆒", "💘", "🙉", "🦄", "😘", "💊", "🙊", "😎", "👾", "🤷‍♂", "🤷", "🤷‍♀", "😡"];

function getRandomReaction(type) {
  let pool;
  if (type === 'positive') {
    pool = positiveReactions;
  } else if (type === 'negative') {
    pool = negativeReactions;
  } else {
    pool = allReactions;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function getLatestMessage(token, chatId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/getUpdates?limit=100&offset=-100`,
      method: 'GET'
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.ok && result.result.length > 0) {
            for (let i = result.result.length - 1; i >= 0; i--) {
              const update = result.result[i];
              const message = update.channel_post || update.message;
              if (message && message.chat.id.toString() === chatId.toString()) {
                resolve(message.message_id);
                return;
              }
            }
          }
          reject(new Error('No message found in chat'));
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', reject);
    request.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, pathname } = parse(req.url, true);

  if (pathname === '/health' || pathname === '/ping') {
    return res.status(200).json({ status: 'ok', timestamp: Date.now() });
  }

  if (pathname === '/help' || pathname === '/docs') {
    return res.status(200).json({
      api: 'Telegram Reaction Bot API',
      version: '2.0',
      endpoints: {
        '/': 'Main endpoint for sending reactions',
        '/health': 'Health check endpoint',
        '/help': 'API documentation'
      },
      parameters: {
        token: 'Bot tokens (comma-separated) - Required',
        chat: 'Chat IDs (comma-separated) - Required',
        message: 'Message IDs (comma-separated) - Optional, auto-fetches if not provided',
        reaction: 'Reaction type: positive, negative, mix - Default: mix',
        delay: 'Delay between reactions in milliseconds - Default: 0',
        big: 'Send big reactions (true/false) - Default: false',
        remove: 'Remove reactions instead of adding (true/false) - Default: false',
        unique: 'Ensure unique reactions per message (true/false) - Default: true',
        count: 'Number of reactions per bot (1-3) - Default: 1'
      },
      examples: [
        '/?token=TOKEN1,TOKEN2&chat=-1001234567890&reaction=positive',
        '/?token=TOKEN&chat=CHAT1,CHAT2&message=123&reaction=mix&delay=1000',
        '/?token=TOKEN&chat=CHAT&message=123&remove=true',
        '/?token=TOKEN&chat=CHAT&reaction=positive&big=true&count=2'
      ]
    });
  }

  const tokens = query.token ? query.token.split(',').map(t => t.trim()) : [];
  const chatIds = query.chat ? query.chat.split(',').map(c => c.trim()) : [];
  let messageIds = query.message ? query.message.split(',').map(m => m.trim()) : [];
  const reactType = query.reaction || query.react || 'mix';
  const delayMs = parseInt(query.delay) || 0;
  const isBig = query.big === 'true';
  const removeReaction = query.remove === 'true';
  const uniqueReactions = query.unique !== 'false';
  const reactionCount = Math.min(Math.max(parseInt(query.count) || 1, 1), 3);

  if (!tokens.length) {
    return res.status(400).json({ error: 'No bot tokens provided', help: '/help' });
  }

  if (!chatIds.length) {
    return res.status(400).json({ error: 'No chat IDs provided', help: '/help' });
  }

  if (!['positive', 'negative', 'mix'].includes(reactType)) {
    return res.status(400).json({ error: 'Invalid reaction type. Use: positive, negative, or mix', help: '/help' });
  }

  if (!messageIds.length) {
    const fetchPromises = [];
    chatIds.forEach(chatId => {
      fetchPromises.push(
        getLatestMessage(tokens[0], chatId)
          .then(msgId => ({ chatId, messageId: msgId.toString() }))
          .catch(() => ({ chatId, messageId: null }))
      );
    });
    
    try {
      const fetchedMessages = await Promise.all(fetchPromises);
      const validMessages = fetchedMessages.filter(m => m.messageId !== null);
      
      if (validMessages.length === 0) {
        return res.status(400).json({ error: 'Could not fetch latest messages from any chat' });
      }
      
      const usedReactions = new Map();
      const combinations = [];
      
      tokens.forEach(token => {
        validMessages.forEach(({ chatId, messageId }) => {
          for (let i = 0; i < reactionCount; i++) {
            const key = `${chatId}-${messageId}`;
            if (!usedReactions.has(key)) {
              usedReactions.set(key, new Set());
            }
            
            let reaction = getRandomReaction(reactType);
            const usedSet = usedReactions.get(key);
            let attempts = 0;
            const maxPool = reactType === 'positive' ? positiveReactions.length : 
                            reactType === 'negative' ? negativeReactions.length : allReactions.length;
            
            if (uniqueReactions) {
              while (usedSet.has(reaction) && usedSet.size < maxPool && attempts < 100) {
                reaction = getRandomReaction(reactType);
                attempts++;
              }
              usedSet.add(reaction);
            }
            
            combinations.push({ token, chatId, messageId, reaction });
          }
        });
      });
      
      const results = [];
      for (let i = 0; i < combinations.length; i++) {
        const combo = combinations[i];
        try {
          if (delayMs > 0 && i > 0) await sleep(delayMs);
          const result = await makeRequest(combo.token, combo.chatId, combo.messageId, combo.reaction, isBig, removeReaction);
          results.push({
            token: combo.token,
            chat_id: combo.chatId,
            message_id: combo.messageId,
            reaction: combo.reaction,
            status: 'fulfilled',
            data: result
          });
        } catch (error) {
          results.push({
            token: combo.token,
            chat_id: combo.chatId,
            message_id: combo.messageId,
            reaction: combo.reaction,
            status: 'rejected',
            data: error.message || error
          });
        }
      }

      return res.status(200).json({ 
        success: true,
        total: results.length,
        results: results 
      });
      
    } catch (error) {
      return res.status(400).json({ error: 'Error fetching messages', details: error.message });
    }
  }

  const usedReactions = new Map();
  const combinations = [];
  
  tokens.forEach(token => {
    chatIds.forEach(chatId => {
      messageIds.forEach(messageId => {
        for (let i = 0; i < reactionCount; i++) {
          const key = `${chatId}-${messageId}`;
          if (!usedReactions.has(key)) {
            usedReactions.set(key, new Set());
          }
          
          let reaction = getRandomReaction(reactType);
          const usedSet = usedReactions.get(key);
          let attempts = 0;
          const maxPool = reactType === 'positive' ? positiveReactions.length : 
                          reactType === 'negative' ? negativeReactions.length : allReactions.length;
          
          if (uniqueReactions) {
            while (usedSet.has(reaction) && usedSet.size < maxPool && attempts < 100) {
              reaction = getRandomReaction(reactType);
              attempts++;
            }
            usedSet.add(reaction);
          }
          
          combinations.push({ token, chatId, messageId, reaction });
        }
      });
    });
  });

  const results = [];
  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    try {
      if (delayMs > 0 && i > 0) await sleep(delayMs);
      const result = await makeRequest(combo.token, combo.chatId, combo.messageId, combo.reaction, isBig, removeReaction);
      results.push({
        token: combo.token,
        chat_id: combo.chatId,
        message_id: combo.messageId,
        reaction: combo.reaction,
        status: 'fulfilled',
        data: result
      });
    } catch (error) {
      results.push({
        token: combo.token,
        chat_id: combo.chatId,
        message_id: combo.messageId,
        reaction: combo.reaction,
        status: 'rejected',
        data: error.message || error
      });
    }
  }

  res.status(200).json({ 
    success: true,
    total: results.length,
    results: results 
  });
};

function makeRequest(token, chatId, messageId, reaction, isBig, remove) {
  return new Promise((resolve, reject) => {
    const payload = {
      chat_id: chatId,
      message_id: parseInt(messageId),
      reaction: remove ? [] : [{ type: "emoji", emoji: reaction }],
      is_big: isBig
    };
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/setMessageReaction`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const request = https.request(options, (response) => {
      let responseData = '';
      response.on('data', chunk => responseData += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    request.on('error', reject);
    request.write(postData);
    request.end();
  });
                                           }
