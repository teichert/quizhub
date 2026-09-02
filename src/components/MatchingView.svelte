<script lang="ts">
    import type { MatchingQuestion } from '../quiz';
    export let question: MatchingQuestion;
</script>

<div class="matching">
    {#each question.pairs as pair, i}
        <label class="match-row">
            <span class="prompt">{@html pair.promptHtml}</span>
            <select bind:value="{question.selections[i]}">
                <option value="{null}">-</option>
                {#each question.answers as option}
                    <option value="{option.id}">{option.html}</option>
                {/each}
            </select>
        </label>
    {/each}
</div>

<style>
    .matching {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem;
    }
    .match-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    .prompt {
        flex: 1;
    }
    select {
        min-width: 10rem;
    }
    :global(.prompt p) {
        margin-block-start: 0;
        margin-block-end: 0;
    }
</style>
