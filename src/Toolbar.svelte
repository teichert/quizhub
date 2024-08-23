<script>
    import Button from './components/Button.svelte';
    import Icon from './components/Icon.svelte';
    import defaultText from './toolbarDefaultText';
    import { writable, get } from 'svelte/store';
    import { onMount } from 'svelte';
    import { text } from 'svelte/internal';

    let fileId = null;
    let filename = writable('');

    let isRenewing = false;
    let isLoading = false;

    // Store for toolbar content
    export const content = writable('');

    function markdownDownload(url, fn, errorFn) {
        fetch(url)
            .then((response) => response.text())
            .then((text) => fn(text))
            .catch((error) => {
                console.error('Error fetching markdown:', error);
                errorFn(error);
            });
    }

    onMount(() => {
        document.documentElement.style.setProperty(
            '--toolbar-color-primary',
            '#1b73e8'
        );

        const queryParams = new URLSearchParams(window.location.search);

        const sourceUrl = queryParams.get('source') || queryParams.get('s');
        const encodedText = queryParams.get('text') || queryParams.get('t');
        if (sourceUrl) {
            markdownDownload(sourceUrl, (text) => {
                content.set(text);
                callOutsideOnInternalChange(text);
            });
            return;
        } else if (encodedText) {
            const text = atob(encodedText);
            // const text = decodeURIComponent(encodedText);
            content.set(text);
            callOutsideOnInternalChange(text);
            return;
        }
        fetchStorageContent();
    });

    // Function to fetch and set initial content
    function fetchStorageContent() {
        // Simulate fetching content (replace with actual storage fetch)
        let contentNew = sessionStorage.getItem('liveEditorContent');
        if (!contentNew) {
            contentNew = defaultText;
        }
        content.set(contentNew);
        callOutsideOnInternalChange(contentNew);
    }

    // Expose content for initial fetch
    export function getContent() {
        return get(content);
    }

    let callOutsideOnInternalChange = (text) => {};

    export function registerTextChange(callback) {
        callOutsideOnInternalChange = callback;
    }

    export function onTextChange(text) {
        if (get(content) == text) {
            return;
        }
        content.set(text);
        if (!fileId) {
            sessionStorage.setItem('liveEditorContent', text);
            console.log('Updated content');
        }
    }

    // Simulate calling the registered callback on content change
    $: content,
        callOutsideOnInternalChange &&
            callOutsideOnInternalChange(get(content));

    export function save() {
        const rawContent = get(content);
        const encodedContent = btoa(rawContent);
        // const encodedContent = encodeURIComponent(rawContent);
        const currentSearch = window.location.search;
        const newLocation =
            window.location.href.replace(currentSearch, '') +
            '?t=' +
            encodedContent;

        history.pushState({}, null, newLocation);
    }

    function download() {
        console.log('Downloading');
        downloadContent(get(content), 'Quiz.md');
    }

    function downloadContent(content, filename) {
        const encodedContent = encodeURIComponent(content);
        let element = document.createElement('a');
        element.setAttribute(
            'href',
            'data:text/plain;charset=utf-8,' + encodedContent
        );
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
</script>

{#if isLoading}
    <span></span>
    <div class="spinner"></div>
    <span></span>
{:else}
    <span
        style="padding-left: 10px; display: inline-flex; align-items: center;"
    >
        <a href="/quizhub/">
            <Button title="Home">
                <img
                    src="/quizhub/icon.svg"
                    alt="quiz home"
                    style="height: 16px;"
                />
            </Button>
        </a>
    </span>
    <span style="display: inline-flex;">
        <Button title="Save (in url)" buttonAction="{save}">Save</Button>
        <Button title="Download" buttonAction="{download}">Download</Button>
        <Button
            title="Sample"
            buttonAction="{() => {
                let newContent = defaultText + '\n\n' + get(content);
                content.set(newContent);
                callOutsideOnInternalChange(newContent);
            }}"
        >
            Sample
        </Button>
    </span>

    <!-- Right sided buttons -->
    <span style="padding-right: 10px; display:inline-flex; gap: 10px;">
        <div id="signinDiv"></div>
    </span>
{/if}

<style>
    .user-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        max-width: 150px;
    }
    .user-image {
        height: 32px;
        border-radius: 16px;
    }

    .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border-left-color: var(--toolbar-color-primary);
        animation: spin 1s ease infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .input-container {
        width: 100%;
        position: relative;
        display: inline-block;
    }

    input[type='text'] {
        text-align: center;
        font-size: medium;
        width: 100%;
        min-width: 100px;
        height: 34px;
        box-sizing: border-box;
        border: 2px solid white;
        border-radius: 4px;
        background-color: white;
        transition:
            border-color 0.3s ease-in-out,
            box-shadow 0.3s ease-in-out;
    }

    .within-spinner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: spin2 1s ease infinite;
    }
    @keyframes spin2 {
        0% {
            transform: translate(-50%, -50%) rotate(0deg);
        }
        100% {
            transform: translate(-50%, -50%) rotate(360deg);
        }
    }
    input[type='text']:hover:not(:disabled),
    input[type='text']:focus:not(:disabled) {
        outline: none;
        border-color: var(--toolbar-color-primary);
        box-shadow: 0 0 8px 0
            color-mix(in srgb, var(--toolbar-color-primary) 30%, white 70%);
    }

    input[type='text']:disabled {
        background-color: white;
        filter: grayscale(100%);
        color: gray;
        cursor: initial;
        opacity: 50%;
    }
</style>
