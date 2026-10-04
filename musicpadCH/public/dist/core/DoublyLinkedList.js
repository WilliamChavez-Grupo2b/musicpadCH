/**
 * DoublyLinkedList<T>
 * --------------------------------------------------------------------------
 * A generic doubly linked list implementation.
 *
 * This is the core data structure requested by the workshop ("Listas Dobles").
 * Every node keeps a reference to both the previous and the next node, which
 * is exactly what lets the music player move forward (next track) and
 * backward (previous track) in O(1) once a node is known, and insert songs
 * at the start, at the end, or at any position without shifting an array.
 */
export class DoublyLinkedListNode {
    constructor(value) {
        this.prev = null;
        this.next = null;
        this.value = value;
    }
}
export class DoublyLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
    get size() {
        return this.length;
    }
    get isEmpty() {
        return this.length === 0;
    }
    getHead() {
        return this.head;
    }
    getTail() {
        return this.tail;
    }
    /** Inserts a value at the beginning of the list. O(1) */
    addFirst(value) {
        const node = new DoublyLinkedListNode(value);
        if (!this.head) {
            this.head = this.tail = node;
        }
        else {
            node.next = this.head;
            this.head.prev = node;
            this.head = node;
        }
        this.length++;
        return node;
    }
    /** Inserts a value at the end of the list. O(1) */
    addLast(value) {
        const node = new DoublyLinkedListNode(value);
        if (!this.tail) {
            this.head = this.tail = node;
        }
        else {
            node.prev = this.tail;
            this.tail.next = node;
            this.tail = node;
        }
        this.length++;
        return node;
    }
    /**
     * Inserts a value at a specific zero-based position.
     * Index <= 0 behaves like addFirst, index >= size behaves like addLast.
     * O(n) to locate the position (walks from whichever end is closer).
     */
    addAt(index, value) {
        if (index <= 0 || this.isEmpty) {
            return this.addFirst(value);
        }
        if (index >= this.length) {
            return this.addLast(value);
        }
        const target = this.getNodeAt(index);
        const node = new DoublyLinkedListNode(value);
        const before = target.prev;
        node.prev = before;
        node.next = target;
        before.next = node;
        target.prev = node;
        this.length++;
        return node;
    }
    /** Removes a known node directly from the list. O(1) */
    removeNode(node) {
        const { prev, next } = node;
        if (prev) {
            prev.next = next;
        }
        else {
            this.head = next;
        }
        if (next) {
            next.prev = prev;
        }
        else {
            this.tail = prev;
        }
        node.prev = null;
        node.next = null;
        this.length--;
    }
    /** Removes and returns the value located at a zero-based index. */
    removeAt(index) {
        const node = this.getNodeAt(index);
        if (!node)
            return undefined;
        this.removeNode(node);
        return node.value;
    }
    /** Returns the first node matching the predicate, or null. O(n) */
    find(predicate) {
        let current = this.head;
        while (current) {
            if (predicate(current.value))
                return current;
            current = current.next;
        }
        return null;
    }
    /** Returns the node at a zero-based index, walking from the nearer end. */
    getNodeAt(index) {
        if (index < 0 || index >= this.length)
            return null;
        let current;
        if (index <= this.length / 2) {
            current = this.head;
            for (let i = 0; i < index && current; i++) {
                current = current.next;
            }
        }
        else {
            current = this.tail;
            for (let i = this.length - 1; i > index && current; i--) {
                current = current.prev;
            }
        }
        return current;
    }
    toArray() {
        const result = [];
        let current = this.head;
        while (current) {
            result.push(current.value);
            current = current.next;
        }
        return result;
    }
    clear() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
    [Symbol.iterator]() {
        let current = this.head;
        return {
            next() {
                if (current) {
                    const value = current.value;
                    current = current.next;
                    return { value, done: false };
                }
                return { value: undefined, done: true };
            },
        };
    }
}
//# sourceMappingURL=DoublyLinkedList.js.map