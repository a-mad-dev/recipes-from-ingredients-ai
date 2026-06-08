/* ==========================================================================
   CHEF AI CORE JAVASCRIPT - VANILLA IMPL
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. STATE & DOM ELEMENTS
    // ---------------------------------------------------------
    const state = {
        ingredients: [],
        quickModes: new Set(),
        settings: {
            apiKey: '',
            model: 'openai/gpt-4o-mini'
        },
        activeRecipe: null,
        theme: 'dark'
    };

    // DOM Selectors
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const settingsForm = document.getElementById('settings-form');
    const apiKeyInput = document.getElementById('api-key-input');
    const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
    const modelSelect = document.getElementById('model-select');
    const settingsSaveBtn = document.getElementById('settings-save-btn');
    
    const ingredientInput = document.getElementById('ingredient-input');
    const addIngredientBtn = document.getElementById('add-ingredient-btn');
    const ingredientsList = document.getElementById('ingredients-list');
    const clearIngredientsBtn = document.getElementById('clear-ingredients-btn');
    const modeChips = document.querySelectorAll('.mode-chip');
    
    const generateRecipeBtn = document.getElementById('generate-recipe-btn');
    const recipeEmptyState = document.getElementById('recipe-empty-state');
    const recipeLoadingState = document.getElementById('recipe-loading-state');
    const recipeContentState = document.getElementById('recipe-content-state');
    const loadingStatusText = document.getElementById('loading-status-text');
    
    const recipeTitle = document.getElementById('recipe-title');
    const recipeIngredientsList = document.getElementById('recipe-ingredients-list');
    const recipeInstructionsList = document.getElementById('recipe-instructions-list');
    const recipeTipsContainer = document.getElementById('recipe-tips-container');
    const recipeTipsContent = document.getElementById('recipe-tips-content');
    
    const copyRecipeBtn = document.getElementById('copy-recipe-btn');
    const regenerateRecipeBtn = document.getElementById('regenerate-recipe-btn');
    const toastNotification = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');

    // ---------------------------------------------------------
    // 2. TOAST SYSTEM
    // ---------------------------------------------------------
    let toastTimeout;
    function showToast(message, duration = 3000) {
        clearTimeout(toastTimeout);
        toastMessage.textContent = message;
        toastNotification.classList.remove('hidden');
        
        toastTimeout = setTimeout(() => {
            toastNotification.classList.add('hidden');
        }, duration);
    }

    // ---------------------------------------------------------
    // 3. THEME TOGGLE (DARK / LIGHT)
    // ---------------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('chefai_theme');
        if (savedTheme) {
            state.theme = savedTheme;
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            state.theme = prefersDark ? 'dark' : 'light';
        }
        applyTheme();
    }

    function applyTheme() {
        htmlEl.setAttribute('data-theme', state.theme);
        localStorage.setItem('chefai_theme', state.theme);
    }

    themeToggleBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
    });

    // ---------------------------------------------------------
    // 4. API & ENGINE CONFIGURATIONS (SETTINGS)
    // ---------------------------------------------------------
    function loadSettings() {
        const savedKey = localStorage.getItem('chefai_api_key');
        const savedModel = localStorage.getItem('chefai_model');
        
        if (savedKey) state.settings.apiKey = savedKey;
        if (savedModel) state.settings.model = savedModel;
        
        apiKeyInput.value = state.settings.apiKey;
        modelSelect.value = state.settings.model;
    }

    function toggleModal(show) {
        if (show) {
            settingsModal.classList.remove('hidden');
            apiKeyInput.focus();
        } else {
            settingsModal.classList.add('hidden');
        }
    }

    settingsToggleBtn.addEventListener('click', () => toggleModal(true));
    settingsCloseBtn.addEventListener('click', () => toggleModal(false));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) toggleModal(false);
    });

    // Toggle API Key visibility
    toggleKeyVisibilityBtn.addEventListener('click', () => {
        const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        apiKeyInput.setAttribute('type', type);
        
        const eyeIcon = toggleKeyVisibilityBtn.querySelector('.eye-icon');
        const eyeOffIcon = toggleKeyVisibilityBtn.querySelector('.eye-off-icon');
        
        if (type === 'text') {
            eyeIcon.classList.add('hidden');
            eyeOffIcon.classList.remove('hidden');
        } else {
            eyeIcon.classList.remove('hidden');
            eyeOffIcon.classList.add('hidden');
        }
    });

    // Save Settings
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;
        
        state.settings.apiKey = apiKey;
        state.settings.model = model;
        
        localStorage.setItem('chefai_api_key', apiKey);
        localStorage.setItem('chefai_model', model);
        
        showToast('Settings saved successfully!');
        toggleModal(false);
    });

    // ---------------------------------------------------------
    // 5. INGREDIENT HANDLING
    // ---------------------------------------------------------
    function loadIngredients() {
        const savedIngredients = localStorage.getItem('chefai_ingredients');
        if (savedIngredients) {
            try {
                state.ingredients = JSON.parse(savedIngredients);
                renderIngredients();
            } catch (e) {
                console.error("Error loading ingredients", e);
            }
        }
    }

    function saveIngredients() {
        localStorage.setItem('chefai_ingredients', JSON.stringify(state.ingredients));
    }

    function addIngredient() {
        const value = ingredientInput.value.trim();
        if (!value) return;

        // Split by commas in case user inputs multiple ingredients at once
        const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
        
        let addedCount = 0;
        items.forEach(item => {
            const capitalizedItem = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
            if (!state.ingredients.includes(capitalizedItem)) {
                state.ingredients.push(capitalizedItem);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            renderIngredients();
            saveIngredients();
        } else {
            showToast('Ingredient already added!');
        }

        ingredientInput.value = '';
        ingredientInput.focus();
    }

    function removeIngredient(index) {
        state.ingredients.splice(index, 1);
        renderIngredients();
        saveIngredients();
    }

    function clearAllIngredients() {
        state.ingredients = [];
        renderIngredients();
        saveIngredients();
        showToast('Ingredients cleared!');
    }

    function renderIngredients() {
        ingredientsList.innerHTML = '';
        
        if (state.ingredients.length === 0) {
            clearIngredientsBtn.classList.add('hidden');
            return;
        }

        clearIngredientsBtn.classList.remove('hidden');
        
        state.ingredients.forEach((item, index) => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.innerHTML = `
                <span>${escapeHtml(item)}</span>
                <button class="chip-remove-btn" aria-label="Remove ${item}" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            ingredientsList.appendChild(chip);
        });

        // Add remove click listeners
        document.querySelectorAll('.chip-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-index'));
                removeIngredient(idx);
            });
        });
    }

    // Input Events
    addIngredientBtn.addEventListener('click', addIngredient);
    ingredientInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') addIngredient();
    });
    clearIngredientsBtn.addEventListener('click', clearAllIngredients);

    // ---------------------------------------------------------
    // 6. QUICK MODES (PREFERENCES)
    // ---------------------------------------------------------
    modeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const mode = chip.getAttribute('data-mode');
            if (state.quickModes.has(mode)) {
                state.quickModes.delete(mode);
                chip.classList.remove('selected');
            } else {
                state.quickModes.add(mode);
                chip.classList.add('selected');
            }
        });
    });

    // ---------------------------------------------------------
    // 7. RECIPE AI GENERATOR & PROMPT BUILDER
    // ---------------------------------------------------------
    // Dynamic status text transitions while loading
    const statusMessages = [
        "Preheating AI oven...",
        "Gathering fresh herbs...",
        "Chopping ingredients...",
        "Simmering creativity...",
        "Stirring the AI pot...",
        "Garnishing details...",
        "Plating the dish..."
    ];
    let statusInterval;

    function startLoadingAnimation() {
        recipeEmptyState.classList.add('hidden');
        recipeContentState.classList.add('hidden');
        recipeLoadingState.classList.remove('hidden');
        generateRecipeBtn.disabled = true;
        
        let step = 0;
        loadingStatusText.textContent = statusMessages[0];
        
        statusInterval = setInterval(() => {
            step = (step + 1) % statusMessages.length;
            loadingStatusText.textContent = statusMessages[step];
        }, 2500);
    }

    function stopLoadingAnimation() {
        clearInterval(statusInterval);
        generateRecipeBtn.disabled = false;
        recipeLoadingState.classList.add('hidden');
    }

    // Call OpenRouter API
    async function generateRecipe() {
        if (state.ingredients.length === 0) {
            showToast('Please add at least one ingredient first!');
            ingredientInput.focus();
            return;
        }

        if (!state.settings.apiKey) {
            showToast('Please enter your API key in configurations.');
            toggleModal(true);
            return;
        }

        startLoadingAnimation();

        try {
            // Build Prompt
            const ingredientsString = state.ingredients.join(', ');
            let prompt = `You are a professional chef.

Create a recipe using ONLY the following ingredients:
[INGREDIENTS]

Return the response in this format:

Title:
<recipe name>

Ingredients:
- item 1
- item 2

Instructions:
1. step one
2. step two

Optional Tips:
- tips here`;

            prompt = prompt.replace('[INGREDIENTS]', ingredientsString);

            // Append modifications based on Quick Modes
            let additions = [];
            if (state.quickModes.has('high-protein')) {
                additions.push("Additionally, ensure the recipe is high in protein.");
            }
            if (state.quickModes.has('budget')) {
                additions.push("Additionally, make this a budget-friendly meal with highly accessible modifications.");
            }
            if (state.quickModes.has('quick')) {
                additions.push("Additionally, ensure the recipe is simple and fast to make (taking under 20 minutes in total).");
            }

            if (additions.length > 0) {
                prompt += `\n\nNote:\n${additions.join('\n')}`;
            }

            // API Request
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.settings.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: state.settings.model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMsg = `Server returned status ${response.status}`;
                if (response.status === 401) {
                    errorMsg = "Unauthorized: Your API Key is invalid. Check settings.";
                } else if (errorData.error && errorData.error.message) {
                    errorMsg = errorData.error.message;
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            
            if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
                throw new Error("No recipe content received from API. Fallback triggered.");
            }

            const rawText = data.choices[0].message.content;
            
            // Parse & Save
            const parsedRecipe = parseRecipe(rawText);
            state.activeRecipe = parsedRecipe;
            
            localStorage.setItem('chefai_last_recipe', JSON.stringify(parsedRecipe));
            
            renderRecipe(parsedRecipe);
            showToast('Bon Appétit! Recipe generated.');

        } catch (error) {
            console.error("Recipe generation failed:", error);
            showToast(`Error: ${error.message}`, 5000);
            
            // Revert UI to previous recipe or empty state
            if (state.activeRecipe) {
                renderRecipe(state.activeRecipe);
            } else {
                recipeEmptyState.classList.remove('hidden');
                recipeContentState.classList.add('hidden');
            }
        } finally {
            stopLoadingAnimation();
        }
    }

    // ---------------------------------------------------------
    // 8. PARSING & RENDERING UTILITIES
    // ---------------------------------------------------------
    function parseRecipe(text) {
        // Prepare cleaning patterns to match headers regardless of bold symbols
        const cleanText = text
            .replace(/\*?\*?Title:\*?\*?/i, 'Title:')
            .replace(/\*?\*?Ingredients:\*?\*?/i, 'Ingredients:')
            .replace(/\*?\*?Instructions:\*?\*?/i, 'Instructions:')
            .replace(/\*?\*?Optional Tips:\*?\*?/i, 'Optional Tips:');

        const titleIdx = cleanText.indexOf('Title:');
        const ingIdx = cleanText.indexOf('Ingredients:');
        const instIdx = cleanText.indexOf('Instructions:');
        const tipsIdx = cleanText.indexOf('Optional Tips:');

        let title = "Delicious AI Recipe";
        let ingredients = [];
        let instructions = [];
        let tips = [];

        // Determine title boundary
        if (titleIdx !== -1) {
            const nextIdx = ingIdx !== -1 ? ingIdx : (instIdx !== -1 ? instIdx : cleanText.length);
            title = cleanText.substring(titleIdx + 6, nextIdx).trim();
        }

        // Determine ingredients boundary
        if (ingIdx !== -1) {
            const nextIdx = instIdx !== -1 ? instIdx : (tipsIdx !== -1 ? tipsIdx : cleanText.length);
            const rawIngs = cleanText.substring(ingIdx + 12, nextIdx).trim();
            ingredients = rawIngs.split('\n')
                .map(line => line.trim().replace(/^-\s*/, ''))
                .filter(line => line.length > 0);
        }

        // Determine instructions boundary
        if (instIdx !== -1) {
            const nextIdx = tipsIdx !== -1 ? tipsIdx : cleanText.length;
            const rawInsts = cleanText.substring(instIdx + 13, nextIdx).trim();
            instructions = rawInsts.split('\n')
                .map(line => line.trim().replace(/^\d+\.\s*/, ''))
                .filter(line => line.length > 0);
        }

        // Determine tips boundary
        if (tipsIdx !== -1) {
            const rawTips = cleanText.substring(tipsIdx + 14).trim();
            tips = rawTips.split('\n')
                .map(line => line.trim().replace(/^-\s*/, ''))
                .filter(line => line.length > 0);
        }

        return { title, ingredients, instructions, tips, rawText: text };
    }

    function renderRecipe(recipe) {
        if (!recipe) return;

        // Check for complete failure of parsing
        if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
            renderFallbackRecipe(recipe.rawText);
            return;
        }

        recipeTitle.textContent = recipe.title;

        // Render checklist ingredients
        recipeIngredientsList.innerHTML = '';
        recipe.ingredients.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" aria-label="Toggle ${item}">
                <span>${escapeHtml(item)}</span>
            `;
            
            // Checkbox change listener
            const checkbox = li.querySelector('input');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    li.classList.add('checked');
                } else {
                    li.classList.remove('checked');
                }
            });

            // Click listener on full line
            li.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });

            recipeIngredientsList.appendChild(li);
        });

        // Render instruction steps
        recipeInstructionsList.innerHTML = '';
        recipe.instructions.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            recipeInstructionsList.appendChild(li);
        });

        // Render Tips
        if (recipe.tips && recipe.tips.length > 0) {
            recipeTipsContainer.classList.remove('hidden');
            recipeTipsContent.innerHTML = '';
            recipe.tips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                recipeTipsContent.appendChild(li);
            });
        } else {
            recipeTipsContainer.classList.add('hidden');
        }

        recipeEmptyState.classList.add('hidden');
        recipeContentState.classList.remove('hidden');
        
        // Scroll recipe container body to top
        document.querySelector('.recipe-body').scrollTop = 0;
    }

    function renderFallbackRecipe(rawText) {
        recipeTitle.textContent = "AI Generated Recipe (Raw Mode)";
        
        recipeIngredientsList.innerHTML = `
            <li class="help-text">Failed to split recipe formatting. Reading entire output below.</li>
        `;
        
        recipeInstructionsList.innerHTML = `
            <li style="list-style: none; white-space: pre-wrap; font-family: monospace; line-height: 1.5; color: var(--text-secondary);">
                ${escapeHtml(rawText)}
            </li>
        `;
        
        recipeTipsContainer.classList.add('hidden');
        recipeEmptyState.classList.add('hidden');
        recipeContentState.classList.remove('hidden');
    }

    function loadLastRecipe() {
        const saved = localStorage.getItem('chefai_last_recipe');
        if (saved) {
            try {
                state.activeRecipe = JSON.parse(saved);
                renderRecipe(state.activeRecipe);
            } catch (e) {
                console.error("Error loading last recipe", e);
            }
        }
    }

    // ---------------------------------------------------------
    // 9. COPY & REGENERATE FUNCTIONS
    // ---------------------------------------------------------
    function copyRecipeToClipboard() {
        if (!state.activeRecipe) return;

        const recipe = state.activeRecipe;
        let copyText = `${recipe.title}\n\n`;
        
        copyText += `Ingredients:\n`;
        recipe.ingredients.forEach(ing => {
            copyText += `- ${ing}\n`;
        });
        
        copyText += `\nInstructions:\n`;
        recipe.instructions.forEach((inst, index) => {
            copyText += `${index + 1}. ${inst}\n`;
        });

        if (recipe.tips && recipe.tips.length > 0) {
            copyText += `\nOptional Tips:\n`;
            recipe.tips.forEach(tip => {
                copyText += `- ${tip}\n`;
            });
        }

        // Use modern clipboard API or fallback
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(copyText)
                .then(() => showToast('Recipe copied to clipboard!'))
                .catch(() => fallbackCopyText(copyText));
        } else {
            fallbackCopyText(copyText);
        }
    }

    function fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed'; // prevent scroll
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Recipe copied to clipboard!');
        } catch (err) {
            showToast('Could not copy recipe. Please select and copy manually.');
        }
        document.body.removeChild(textArea);
    }

    // Bind controls
    generateRecipeBtn.addEventListener('click', generateRecipe);
    regenerateRecipeBtn.addEventListener('click', generateRecipe);
    copyRecipeBtn.addEventListener('click', copyRecipeToClipboard);

    // Escape characters utility
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ---------------------------------------------------------
    // 10. INITIALIZATION
    // ---------------------------------------------------------
    initTheme();
    loadSettings();
    loadIngredients();
    loadLastRecipe();
});
